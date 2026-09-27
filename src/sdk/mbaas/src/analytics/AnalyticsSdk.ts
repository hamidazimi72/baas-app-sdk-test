import { CoreSdk } from "../core/CoreSdk.js";
import { HttpError } from "../core/FetchHttpClient.js";
import { AnalyticsClientDiagnostics, AnalyticsIdentity, AnalyticsStorage, QueuedAnalyticsEvent } from "./AnalyticsStorage.js";

export type { AnalyticsClientDiagnostics } from "./AnalyticsStorage.js";

export type AnalyticsParamValue = string | number | boolean;
export type AnalyticsParams = Record<string, AnalyticsParamValue>;

export interface AnalyticsCollectEvent {
  event_name: string;
  event_id: string;
  event_timestamp: number;
  engagement_time_msec?: number;
  event_params?: AnalyticsParams;
}

export interface AnalyticsCollectRequest {
  events: AnalyticsCollectEvent[];
  session_id: string;
  app_version: string;
  sdk_version: string;
  platform?: "ANDROID" | "IOS" | "WEB";
  user_id?: string;
  environment?: string;
  user_properties?: Record<string, string>;
  sent_at?: number;
  client_diagnostics?: AnalyticsClientDiagnostics;
}

export interface AnalyticsCollectResponse {
  success: boolean;
  data?: { accepted: number; rejected: number; sessionTimeoutMs?: number };
  error?: string;
}

export type AnalyticsIdentityAction = "setUserId" | "clearUserId" | "resetIdentity";

export interface AnalyticsIdentityResponse {
  success: boolean;
  data?: { action: AnalyticsIdentityAction };
  error?: string;
}

export interface AnalyticsSdkConfig {
  appVersion: string;
  environment?: string;
}

const MAX_QUEUED_EVENTS = 10_000;
const MAX_QUEUE_SIZE_BYTES = 5 * 1024 * 1024;
const RETRY_BASE_DELAY_MS = 1_000;
const RETRY_MAX_DELAY_MS = 60_000;
const SCROLL_THROTTLE_MS = 200;
const VIDEO_PROGRESS_CHECKPOINTS = [10, 25, 50, 75] as const;
const DOWNLOAD_FILE_EXTENSION = /\.(7z|avi|csv|docx?|exe|gz|key|midi?|mov|mp3|mp4|mpe|mpeg|pdf|pkg|pps|pptx?|rar|rtf|txt|wav|wma|wmv|xlsx?|zip)(?:$|[?#])/i;

const DEFAULTS = {
  // batchSize: 100,
  batchSize: 10,
  // flushIntervalMs: 60 * 60 * 1000,
  flushIntervalMs: 5 * 60 * 1000,
  offlineRetentionMs: 72 * 60 * 60 * 1000,
  sessionTimeoutMs: 30 * 60 * 1000,
  maxBatchEvents: 100,
  maxSdkVersionLength: 30,
  maxEnvironmentLength: 30,
  maxEventNameLength: 40,
  maxEventIdLength: 128,
  maxEventParams: 25,
  maxEventParamKeyLength: 40,
  maxUserProperties: 25,
  maxPropertyKeyLength: 24,
  maxPropertyValueLength: 36,
  maxParamValueLength: 100,
};

const FIRST_VISIT_KEY = "mbaas:analytics:first_visit";
const SESSION_ID_KEY = "mbaas:analytics:session_id";
const SESSION_LAST_ACTIVE_KEY = "mbaas:analytics:session_last_active";
const SESSION_TIMEOUT_KEY = "mbaas:analytics:session_timeout_ms";
const RESERVED_ANALYTICS_KEYS = [
  "password",
  "passwd",
  "pass",
  "pin",
  "otp",
  "national_id",
  "national_code",
  "melli_code",
  "ssn",
  "phone",
  "phone_number",
  "mobile",
  "mobile_number",
  "cellphone",
  "email",
  "email_address",
  "latitude",
  "longitude",
  "lat",
  "lng",
  "lon",
  "card_number",
  "card_no",
  "cvv",
  "iban",
  "sheba",
] as const;
const NORMALIZED_RESERVED_ANALYTICS_KEYS = new Set(
  RESERVED_ANALYTICS_KEYS.map((key) => key.replace(/_/g, "").toLowerCase()),
);

export class AnalyticsSdk {
  private readonly core: CoreSdk;
  private readonly appVersion: string;
  private readonly environment: string | undefined;
  private readonly storage = new AnalyticsStorage();
  private identity: AnalyticsIdentity = {};
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushPromise: Promise<void> | null = null;
  private queueGeneration = 0;
  private collectionPreferenceVersion = 0;
  private collectionPreferenceOverride: boolean | null = null;
  private analyticsCollectionEnabled = true;
  private analyticsUploadPaused = false;
  private activeCollectController: AbortController | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private cancelRetryWait: (() => void) | null = null;
  private ready: Promise<void>;
  private automaticCollectionEnabled = true;
  private automaticScreenTrackingEnabled = true;
  private visibleSince: number | null = null;
  private scrollReported = false;
  private lastPageViewUrl: string | null = null;
  private scrollThrottleTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly startedForms = new WeakSet<HTMLFormElement>();
  private readonly startedVideos = new WeakSet<HTMLVideoElement>();
  private readonly videoProgress = new WeakMap<HTMLVideoElement, Set<number>>();
  private originalPushState: History["pushState"] | null = null;
  private originalReplaceState: History["replaceState"] | null = null;
  private patchedPushState: History["pushState"] | null = null;
  private patchedReplaceState: History["replaceState"] | null = null;

  constructor(core: CoreSdk, config: AnalyticsSdkConfig) {
    if (!core || typeof core.request !== "function") {
      throw new Error("AnalyticsSdk requires a valid CoreSdk instance.");
    }
    this.validateRequiredString(core.SDK_VERSION, "sdk_version", DEFAULTS.maxSdkVersionLength);
    if (!config || typeof config.appVersion !== "string" || !config.appVersion) {
      throw new Error("AnalyticsSdk appVersion is required and must be a string.");
    }
    if (!/^\d+(?:\.\d+)*$/.test(config.appVersion)) {
      throw new Error("AnalyticsSdk appVersion must contain only numbers separated by dots.");
    }
    if (config.environment !== undefined) {
      this.validateEnvironment(config.environment);
    }
    this.core = core;
    this.appVersion = config.appVersion;
    this.environment = config.environment;
    this.ready = this.initialize();
  }

  private async initialize(): Promise<void> {
    const [, storedCollectionEnabled] = await Promise.all([
      this.storage.clearStoredIdentity(),
      this.storage.getAnalyticsCollectionEnabled(),
    ]);
    this.identity = {};
    this.analyticsCollectionEnabled = this.collectionPreferenceOverride ?? storedCollectionEnabled;
    this.attachListeners();
    if (this.analyticsCollectionEnabled) {
      await this.initializeFirstVisitAndSession();
    } else {
      this.clearCurrentSession();
      await this.storage.disableAnalyticsCollection();
    }
    this.flushTimer = setInterval(() => {
      this.flushInBackground();
    }, DEFAULTS.flushIntervalMs);
  }

  async logEvent(eventName: string, eventParams?: AnalyticsParams, engagementTimeMsec?: number): Promise<void> {
    if (!this.analyticsCollectionEnabled) return;
    const eventTimestamp = Date.now();
    await this.ready;
    if (!this.analyticsCollectionEnabled) return;
    await this.enqueueEvent(eventName, eventParams, engagementTimeMsec, eventTimestamp);
  }

  async setUserProperties(properties: Record<string, string>): Promise<void> {
    if (!this.analyticsCollectionEnabled) return;
    const collectionPreferenceVersion = this.collectionPreferenceVersion;
    await this.ready;
    if (!this.analyticsCollectionEnabled || collectionPreferenceVersion !== this.collectionPreferenceVersion) return;
    try {
      this.identity = { ...this.identity, userProperties: this.limitUserProperties(properties) };
    } catch (error: unknown) {
      console.error("[AnalyticsSdk] User properties were not set because they are invalid.", error);
    }
  }

  async clearUserProperties(): Promise<void> {
    await this.ready;
    delete this.identity.userProperties;
  }

  async setUserId(userId: string): Promise<AnalyticsIdentityResponse> {
    const collectionPreferenceVersion = this.collectionPreferenceVersion;
    await this.ready;
    if (!this.analyticsCollectionEnabled || collectionPreferenceVersion !== this.collectionPreferenceVersion) {
      return { success: false, error: "Analytics collection is disabled." };
    }
    this.validateRequiredString(userId, "user_id");
    const response = await this.identityRequest({ action: "setUserId", userId });
    if (response.success) {
      if (!this.analyticsCollectionEnabled || collectionPreferenceVersion !== this.collectionPreferenceVersion) {
        return { success: false, error: "Analytics collection is disabled." };
      }
      this.identity = { ...this.identity, userId };
    }
    return response;
  }

  async clearUserId(): Promise<AnalyticsIdentityResponse> {
    await this.ready;
    const response = await this.identityRequest({ action: "clearUserId" });
    if (response.success) {
      delete this.identity.userId;
    }
    return response;
  }

  async resetIdentity(): Promise<AnalyticsIdentityResponse> {
    await this.ready;
    const response = await this.identityRequest({ action: "resetIdentity" });
    if (response.success) {
      this.queueGeneration++;
      this.activeCollectController?.abort();
      this.clearRetryTimer();
      await this.storage.clearForIdentityReset();
      this.identity = {};
    }
    return response;
  }

  setAutomaticCollection(enabled: boolean): void {
    this.automaticCollectionEnabled = enabled;
    if (!enabled) {
      this.visibleSince = null;
      this.clearScrollThrottle();
    } else if (typeof document !== "undefined" && document.visibilityState !== "hidden") {
      this.visibleSince = Date.now();
    }
  }

  setAutomaticScreenTracking(enabled: boolean): void {
    this.automaticScreenTrackingEnabled = enabled;
  }

  async setAnalyticsCollectionEnabled(enabled: boolean): Promise<void> {
    if (typeof enabled !== "boolean") {
      throw new Error("enabled must be a boolean.");
    }

    const wasEnabled = this.analyticsCollectionEnabled;
    const preferenceVersion = ++this.collectionPreferenceVersion;
    this.collectionPreferenceOverride = enabled;
    this.analyticsCollectionEnabled = enabled;

    if (!enabled) {
      this.queueGeneration++;
      this.activeCollectController?.abort();
      this.clearRetryTimer();
      this.visibleSince = null;
      this.clearCurrentSession();
    }

    await this.ready;
    if (preferenceVersion !== this.collectionPreferenceVersion) return;

    if (!enabled) {
      this.clearCurrentSession();
      await this.storage.disableAnalyticsCollection();
      return;
    }

    await this.storage.setAnalyticsCollectionEnabled(true);
    if (!wasEnabled && this.analyticsCollectionEnabled) {
      await this.initializeFirstVisitAndSession();
    }
  }

  async flush(): Promise<void> {
    await this.ready;
    if (!this.analyticsCollectionEnabled || this.analyticsUploadPaused) return;
    if (this.flushPromise) return this.flushPromise;
    this.flushPromise = this.flushInternal().finally(() => {
      this.flushPromise = null;
    });
    return this.flushPromise;
  }

  destroy(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = null;
    this.activeCollectController?.abort();
    this.clearRetryTimer();
    this.clearScrollThrottle();
    if (typeof document !== "undefined") {
      document.removeEventListener("DOMContentLoaded", this.handleInitialPageView);
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
      document.removeEventListener("click", this.handleClick, true);
      document.removeEventListener("focusin", this.handleFocusIn, true);
      document.removeEventListener("submit", this.handleSubmit, true);
      document.removeEventListener("play", this.handleVideoPlay, true);
      document.removeEventListener("timeupdate", this.handleVideoTimeUpdate, true);
      document.removeEventListener("ended", this.handleVideoEnded, true);
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("pagehide", this.handlePageHide);
      window.removeEventListener("scroll", this.handleScroll);
      window.removeEventListener("popstate", this.handleRouteChange);
      window.removeEventListener("hashchange", this.handleRouteChange);
    }
    this.restoreHistory();
  }

  private async flushInternal(): Promise<void> {
    const queueGeneration = this.queueGeneration;
    // Check required event fields before pruning so missing timestamps cannot be silently discarded.
    (await this.storage.getEvents()).forEach((event) => this.validateQueuedEvent(event));
    await this.pruneEvents();
    const events = await this.storage.getEvents();
    if (!events.length) return;
    this.validateBatch(events.slice(0, DEFAULTS.batchSize));
    let token: string;
    try {
      token = await this.requireInstallationToken();
    } catch {
      return;
    }

    for (let index = 0; index < events.length; index += DEFAULTS.batchSize) {
      if (queueGeneration !== this.queueGeneration) return;
      let batch = events.slice(index, index + DEFAULTS.batchSize);
      let retryAttempt = 0;
      let tokenRefreshAttempted = false;
      while (batch.length) {
        const diagnostics = await this.storage.getClientDiagnostics();
        // Keep payload validation outside the transport catch so callers receive input errors.
        const body = await this.createBatch(batch, diagnostics);
        // Sample the clock after all awaits, immediately before the HTTP call.
        const sentAt = Date.now();
        const eligible = batch.filter((event) =>
          event.eventTimestamp >= sentAt - DEFAULTS.offlineRetentionMs && event.eventTimestamp <= sentAt,
        );
        if (eligible.length !== batch.length) {
          // Token lookup, earlier requests, or batch preparation can outlast the time window.
          await this.pruneEvents();
          batch = eligible;
          continue;
        }
        if (queueGeneration !== this.queueGeneration) return;

        let response: AnalyticsCollectResponse;
        const controller = typeof AbortController === "undefined" ? null : new AbortController();
        this.activeCollectController = controller;
        try {
          response = await this.core.request<AnalyticsCollectResponse>({
            method: "POST",
            url: ":8075/api/v1/analytics/collect",
            headers: { Authorization: `Bearer ${token}` },
            body: { ...body, sent_at: sentAt },
            ...(controller ? { signal: controller.signal } : {}),
          });
        } catch (error: unknown) {
          const status = this.getHttpErrorStatus(error);
          if (status === null) return;
          if (!this.analyticsCollectionEnabled || queueGeneration !== this.queueGeneration) return;

          if (status === 400) {
            await this.storage.deleteEvents(batch.map((event) => event.eventId));
            console.error("[AnalyticsSdk] Dropped a permanently invalid analytics batch after HTTP 400.", error);
            break;
          }

          if (status === 401) {
            if (tokenRefreshAttempted) return;
            tokenRefreshAttempted = true;
            try {
              const refreshResponse = await this.core.refreshInstallationToken();
              if (!refreshResponse.success || !refreshResponse.data?.token) return;
              token = refreshResponse.data.token;
            } catch {
              return;
            }
            continue;
          }

          if (status === 403) {
            this.analyticsUploadPaused = true;
            console.error(
              "[AnalyticsSdk] Analytics uploads were paused for this SDK instance after HTTP 403.",
              error,
            );
            return;
          }

          if (status === 429 || status === 503) {
            retryAttempt++;
            if (!(await this.waitForRetry(retryAttempt, queueGeneration))) return;
            continue;
          }

          return;
        } finally {
          if (this.activeCollectController === controller) {
            this.activeCollectController = null;
          }
        }
        if (!response.success) return;
        if (queueGeneration !== this.queueGeneration) return;
        this.saveSessionTimeout(response.data?.sessionTimeoutMs);
        await this.storage.completeBatch(batch.map((event) => event.eventId), diagnostics);
        break;
      }
    }
  }

  private flushInBackground(): void {
    void this.flush().catch((error: unknown) => {
      console.error("[AnalyticsSdk] Failed to flush analytics events.", error);
    });
  }

  private waitForRetry(attempt: number, queueGeneration: number): Promise<boolean> {
    const exponentialDelay = Math.min(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), RETRY_MAX_DELAY_MS);
    const delay = Math.floor(Math.random() * exponentialDelay);

    return new Promise((resolve) => {
      const finish = (shouldRetry: boolean): void => {
        if (this.retryTimer !== null) clearTimeout(this.retryTimer);
        this.retryTimer = null;
        this.cancelRetryWait = null;
        resolve(shouldRetry);
      };
      this.cancelRetryWait = () => finish(false);
      this.retryTimer = setTimeout(() => {
        finish(this.analyticsCollectionEnabled && queueGeneration === this.queueGeneration);
      }, delay);
    });
  }

  private clearRetryTimer(): void {
    this.cancelRetryWait?.();
  }

  private getHttpErrorStatus(error: unknown): number | null {
    if (error instanceof HttpError) return error.status;
    if (error !== null && typeof error === "object" && "status" in error) {
      const status = (error as { status?: unknown }).status;
      if (typeof status === "number" && Number.isInteger(status)) return status;
    }
    return null;
  }

  private validateBatch(events: QueuedAnalyticsEvent[]): string {
    if (!Array.isArray(events) || events.length < 1 || events.length > DEFAULTS.maxBatchEvents) {
      throw new Error(`events is required and must contain between 1 and ${DEFAULTS.maxBatchEvents} items.`);
    }
    const sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    this.validateRequiredString(sessionId, "session_id");
    this.validateRequiredString(this.appVersion, "app_version");
    this.validateRequiredString(this.core.SDK_VERSION, "sdk_version", DEFAULTS.maxSdkVersionLength);
    if (this.environment !== undefined) {
      this.validateEnvironment(this.environment);
    }
    if (this.identity.userId !== undefined) {
      this.validateRequiredString(this.identity.userId, "user_id");
    }
    for (const event of events) this.validateQueuedEvent(event);
    return sessionId;
  }

  private async createBatch(
    events: QueuedAnalyticsEvent[],
    diagnostics: AnalyticsClientDiagnostics = {},
  ): Promise<AnalyticsCollectRequest> {
    const sessionId = this.validateBatch(events);
    const safeDiagnostics = diagnostics !== null && typeof diagnostics === "object" && !Array.isArray(diagnostics)
      ? diagnostics
      : {};
    const clientDiagnostics = Object.fromEntries(
      ["dropped_expired", "dropped_future_clock", "dropped_queue_overflow"].map((field) => {
        const value = safeDiagnostics[field as keyof AnalyticsClientDiagnostics];
        return [field, typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0];
      }),
    ) as Required<AnalyticsClientDiagnostics>;
    const hasDiagnostics = Object.values(clientDiagnostics).some((count) => count > 0);
    const userProperties = this.identity.userProperties === undefined
      ? undefined
      : this.limitUserProperties(this.identity.userProperties);
    return {
      ...(this.identity.userId ? { user_id: this.identity.userId } : {}),
      platform: "WEB",
      sdk_version: this.core.SDK_VERSION,
      app_version: this.appVersion,
      session_id: sessionId,
      ...(this.environment === undefined ? {} : { environment: this.environment }),
      ...(hasDiagnostics ? { client_diagnostics: clientDiagnostics } : {}),
      ...(userProperties && Object.keys(userProperties).length ? { user_properties: userProperties } : {}),
      events: events.map((event) => {
        const eventParams = event.eventParams === undefined ? undefined : this.limitParams(event.eventParams);
        return {
          event_name: event.eventName,
          event_id: event.eventId,
          event_timestamp: event.eventTimestamp,
          ...(event.engagementTimeMsec === undefined ? {} : { engagement_time_msec: event.engagementTimeMsec }),
          ...(eventParams && Object.keys(eventParams).length ? { event_params: eventParams } : {}),
        };
      }),
    };
  }

  private async enqueueEvent(
    eventName: string,
    eventParams?: AnalyticsParams,
    engagementTimeMsec?: number,
    eventTimestamp = Date.now(),
  ): Promise<void> {
    if (!this.analyticsCollectionEnabled) return;
    const queueGeneration = this.queueGeneration;
    this.validateEventName(eventName);
    const safeEventParams = eventParams === undefined ? undefined : this.limitParams(eventParams);
    const event: QueuedAnalyticsEvent = {
      eventId: this.createEventId(),
      eventName,
      eventTimestamp,
      ...(engagementTimeMsec === undefined ? {} : { engagementTimeMsec }),
      ...(safeEventParams && Object.keys(safeEventParams).length ? { eventParams: safeEventParams } : {}),
    };
    this.validateQueuedEvent(event);
    await this.storage.addEvent(event);
    if (!this.analyticsCollectionEnabled || queueGeneration !== this.queueGeneration) {
      await this.storage.deleteEvents([event.eventId]);
      return;
    }
    await this.pruneEvents();
    sessionStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(Date.now()));
    if ((await this.storage.getEvents()).length >= DEFAULTS.batchSize) this.flushInBackground();
  }

  private async pruneEvents(): Promise<void> {
    const now = Date.now();
    await this.storage.pruneEvents(
      now - DEFAULTS.offlineRetentionMs,
      now,
      MAX_QUEUED_EVENTS,
      MAX_QUEUE_SIZE_BYTES,
    );
  }

  private async identityRequest(body: {
    action: AnalyticsIdentityAction;
    userId?: string;
  }): Promise<AnalyticsIdentityResponse> {
    return this.core.request<AnalyticsIdentityResponse>({
      method: "POST",
      url: ":8075/api/v1/analytics/identity",
      headers: { Authorization: `Bearer ${await this.requireInstallationToken()}` },
      body,
    });
  }

  private async requireInstallationToken(): Promise<string> {
    let token = await this.core.getInstallationToken();
    if (!token) {
      await this.core.initializeApp();
      token = await this.core.getInstallationToken();
    }
    if (!token) throw new Error("AnalyticsSdk requires an installation token.");
    return token;
  }

  private async initializeFirstVisitAndSession(): Promise<void> {
    if (!this.analyticsCollectionEnabled) return;
    if (this.automaticCollectionEnabled && !localStorage.getItem(FIRST_VISIT_KEY)) {
      localStorage.setItem(FIRST_VISIT_KEY, "1");
      await this.enqueueEvent("first_visit");
    }
    if (!this.analyticsCollectionEnabled) return;
    const previousActivity = Number(sessionStorage.getItem(SESSION_LAST_ACTIVE_KEY) ?? 0);
    const startsNewSession = !sessionStorage.getItem(SESSION_ID_KEY) || Date.now() - previousActivity > this.getSessionTimeout();
    if (startsNewSession) {
      sessionStorage.setItem(SESSION_ID_KEY, this.createEventId());
      if (this.automaticCollectionEnabled) await this.enqueueEvent("session_start");
    }
    if (!this.analyticsCollectionEnabled) {
      this.clearCurrentSession();
      return;
    }
    sessionStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(Date.now()));
    this.visibleSince = this.automaticCollectionEnabled && document.visibilityState !== "hidden" ? Date.now() : null;
    if (!this.automaticCollectionEnabled) return;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", this.handleInitialPageView, { once: true });
    } else {
      // initialize() owns this.ready, so enqueueAutomatic() would wait for
      // the promise that is currently waiting for enqueueAutomatic().
      if (this.automaticScreenTrackingEnabled) {
        this.lastPageViewUrl = window.location.href;
        await this.enqueueEvent("page_view");
      }
    }
  }

  private attachListeners(): void {
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    document.addEventListener("click", this.handleClick, true);
    document.addEventListener("focusin", this.handleFocusIn, true);
    document.addEventListener("submit", this.handleSubmit, true);
    document.addEventListener("play", this.handleVideoPlay, true);
    document.addEventListener("timeupdate", this.handleVideoTimeUpdate, true);
    document.addEventListener("ended", this.handleVideoEnded, true);
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("pagehide", this.handlePageHide);
    window.addEventListener("scroll", this.handleScroll, { passive: true });
    window.addEventListener("popstate", this.handleRouteChange);
    window.addEventListener("hashchange", this.handleRouteChange);
    this.patchHistory();
  }

  private readonly handleInitialPageView = (): void => {
    this.trackPageView();
  };
  private readonly handleOnline = (): void => {
    this.flushInBackground();
  };
  private readonly handlePageHide = (): void => {
    this.recordEngagementAndFlush();
  };
  private readonly handleRouteChange = (): void => {
    this.trackPageView();
  };

  private trackPageView(): void {
    const currentUrl = window.location.href;
    if (currentUrl === this.lastPageViewUrl) return;
    this.lastPageViewUrl = currentUrl;
    this.scrollReported = false;
    void this.enqueueAutomatic("page_view");
  }

  private readonly handleVisibilityChange = (): void => {
    if (!this.analyticsCollectionEnabled) return;
    if (document.visibilityState === "visible") {
      const last = Number(sessionStorage.getItem(SESSION_LAST_ACTIVE_KEY) ?? 0);
      if (Date.now() - last > this.getSessionTimeout()) {
        sessionStorage.setItem(SESSION_ID_KEY, this.createEventId());
        void this.enqueueAutomatic("session_start");
      }
      this.visibleSince = this.automaticCollectionEnabled ? Date.now() : null;
      return;
    }
    this.recordEngagementAndFlush();
  };

  private readonly handleScroll = (): void => {
    if (this.scrollReported || this.scrollThrottleTimer !== null || !this.automaticCollectionEnabled ||
      !this.automaticScreenTrackingEnabled) return;
    this.scrollThrottleTimer = setTimeout(() => {
      this.scrollThrottleTimer = null;
      this.evaluateScrollDepth();
    }, SCROLL_THROTTLE_MS);
  };

  private evaluateScrollDepth(): void {
    if (this.scrollReported || !this.automaticCollectionEnabled || !this.automaticScreenTrackingEnabled) return;
    const pageHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
    if (pageHeight > 0 && window.scrollY / pageHeight >= 0.9) {
      this.scrollReported = true;
      void this.enqueueAutomatic("scroll");
    }
  }

  private readonly handleClick = (event: MouseEvent): void => {
    if (!this.automaticCollectionEnabled) return;
    const target = (event.target as Element | null)?.closest("a");
    if (!target || !(target instanceof HTMLAnchorElement)) return;
    const href = target.href;
    if (!href) return;
    const isDownload = target.hasAttribute("download") || DOWNLOAD_FILE_EXTENSION.test(href);
    if (isDownload) {
      void this.enqueueAutomatic("file_download", { file_name: target.download || href.split("/").pop() || "" });
    } else if (new URL(href, window.location.href).hostname !== window.location.hostname) {
      void this.enqueueAutomatic("click", { link_url: href });
    }
  };

  private readonly handleFocusIn = (event: FocusEvent): void => {
    if (!this.automaticCollectionEnabled) return;
    const target = event.target as HTMLElement | null;
    const form = target?.closest("form");
    if (form instanceof HTMLFormElement && !this.startedForms.has(form)) {
      this.startedForms.add(form);
      void this.enqueueAutomatic("form_start");
    }
  };

  private readonly handleSubmit = (event: SubmitEvent): void => {
    if (this.automaticCollectionEnabled && event.target instanceof HTMLFormElement)
      void this.enqueueAutomatic("form_submit");
  };

  private readonly handleVideoPlay = (event: Event): void => {
    if (this.automaticCollectionEnabled && event.target instanceof HTMLVideoElement &&
      !this.startedVideos.has(event.target)) {
      this.startedVideos.add(event.target);
      void this.enqueueAutomatic("video_start");
    }
  };

  private readonly handleVideoTimeUpdate = (event: Event): void => {
    if (!this.automaticCollectionEnabled || !(event.target instanceof HTMLVideoElement) ||
      !Number.isFinite(event.target.duration) || event.target.duration <= 0)
      return;
    const percent = (event.target.currentTime / event.target.duration) * 100;
    const progress = this.videoProgress.get(event.target) ?? new Set<number>();
    for (const checkpoint of VIDEO_PROGRESS_CHECKPOINTS) {
      if (percent >= checkpoint && !progress.has(checkpoint)) {
        progress.add(checkpoint);
        void this.enqueueAutomatic("video_progress", { percent: checkpoint });
      }
    }
    this.videoProgress.set(event.target, progress);
  };

  private readonly handleVideoEnded = (event: Event): void => {
    if (this.automaticCollectionEnabled && event.target instanceof HTMLVideoElement)
      void this.enqueueAutomatic("video_complete");
  };

  private async recordEngagement(): Promise<void> {
    if (!this.analyticsCollectionEnabled || !this.automaticCollectionEnabled || this.visibleSince === null) return;
    const duration = Date.now() - this.visibleSince;
    this.visibleSince = null;
    if (duration > 0) await this.enqueueAutomatic("user_engagement", undefined, duration);
  }

  private async enqueueAutomatic(eventName: string, params?: AnalyticsParams, engagement?: number): Promise<void> {
    if (!this.analyticsCollectionEnabled || !this.automaticCollectionEnabled) return;
    if ((eventName === "page_view" || eventName === "scroll") && !this.automaticScreenTrackingEnabled) return;
    const eventTimestamp = Date.now();
    await this.ready;
    if (!this.analyticsCollectionEnabled || !this.automaticCollectionEnabled) return;
    if (eventName === "page_view") this.scrollReported = false;
    await this.enqueueEvent(eventName, params, engagement, eventTimestamp);
  }

  private patchHistory(): void {
    this.originalPushState = history.pushState;
    this.originalReplaceState = history.replaceState;
    this.patchedPushState = (...args) => {
      this.originalPushState!.apply(history, args);
      this.handleRouteChange();
    };
    this.patchedReplaceState = (...args) => {
      this.originalReplaceState!.apply(history, args);
      this.handleRouteChange();
    };
    history.pushState = this.patchedPushState;
    history.replaceState = this.patchedReplaceState;
  }

  private recordEngagementAndFlush(): void {
    void (async () => {
      try {
        await this.recordEngagement();
      } catch (error: unknown) {
        console.error("[AnalyticsSdk] Failed to enqueue user engagement.", error);
      }
      await this.flushAfterPending();
    })();
  }

  private restoreHistory(): void {
    if (this.patchedPushState && history.pushState === this.patchedPushState && this.originalPushState) {
      history.pushState = this.originalPushState;
    }
    if (this.patchedReplaceState && history.replaceState === this.patchedReplaceState && this.originalReplaceState) {
      history.replaceState = this.originalReplaceState;
    }
    this.patchedPushState = null;
    this.patchedReplaceState = null;
    this.originalPushState = null;
    this.originalReplaceState = null;
  }

  private clearScrollThrottle(): void {
    if (this.scrollThrottleTimer !== null) clearTimeout(this.scrollThrottleTimer);
    this.scrollThrottleTimer = null;
  }

  private async flushAfterPending(): Promise<void> {
    try {
      const pendingFlush = this.flushPromise;
      if (pendingFlush) await pendingFlush;
      await this.flush();
    } catch (error: unknown) {
      console.error("[AnalyticsSdk] Failed to flush analytics events.", error);
    }
  }

  private validateRequiredString(value: unknown, field: string, maxLength?: number): asserts value is string {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`${field} is required and must be a non-empty string.`);
    }
    if (maxLength !== undefined && value.length > maxLength) {
      throw new Error(`${field} must not exceed ${maxLength} characters.`);
    }
  }

  private validateRecord(value: unknown, field: string): void {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${field} must be an object.`);
    }
  }

  private validateEnvironment(environment: string): void {
    if (typeof environment !== "string" || environment.length > DEFAULTS.maxEnvironmentLength) {
      throw new Error(`environment must be a string of at most ${DEFAULTS.maxEnvironmentLength} characters.`);
    }
  }

  private validateQueuedEvent(event: QueuedAnalyticsEvent): void {
    this.validateRecord(event, "event");
    this.validateEventName(event.eventName);
    this.validateRequiredString(event.eventId, "event_id", DEFAULTS.maxEventIdLength);
    if (!Number.isSafeInteger(event.eventTimestamp) || event.eventTimestamp < 0) {
      throw new Error("event_timestamp is required and must be a non-negative integer in epoch milliseconds.");
    }
    if (
      event.engagementTimeMsec !== undefined &&
      (typeof event.engagementTimeMsec !== "number" ||
        !Number.isFinite(event.engagementTimeMsec) ||
        event.engagementTimeMsec < 0)
    ) {
      throw new Error("engagement_time_msec must be a finite non-negative number.");
    }
  }

  private validateEventName(eventName: string): void {
    this.validateRequiredString(eventName, "event_name", DEFAULTS.maxEventNameLength);
    if (
      !new RegExp(`^[a-z][a-z0-9_]{0,${DEFAULTS.maxEventNameLength - 1}}$`).test(eventName) ||
      /^(baas_|mbaas_|xmbaas_)/.test(eventName)
    ) {
      throw new Error("event_name must start with a lowercase letter, contain only lowercase letters, numbers, or underscores, and must not use a reserved prefix.");
    }
  }

  private limitParams(params: AnalyticsParams): AnalyticsParams {
    if (params === null || typeof params !== "object" || Array.isArray(params)) {
      console.error("[AnalyticsSdk] event_params was omitted because it must be an object.");
      return {};
    }
    const safeParams = this.removeReservedKeys(params, "eventParams");
    const accepted: AnalyticsParams = {};
    for (const [key, value] of Object.entries(safeParams)) {
      if (!new RegExp(`^[a-z][a-z0-9_]{0,${DEFAULTS.maxEventParamKeyLength - 1}}$`).test(key)) {
        console.error(`[AnalyticsSdk] event_params.${key} was omitted because its key must start with a lowercase letter, contain only lowercase letters, numbers, or underscores, and not exceed ${DEFAULTS.maxEventParamKeyLength} characters.`);
        continue;
      }
      if (
        typeof value !== "string" &&
        typeof value !== "boolean" &&
        !(typeof value === "number" && Number.isFinite(value))
      ) {
        console.error(`[AnalyticsSdk] event_params.${key} was omitted because its value must be a string, finite number, or boolean.`);
        continue;
      }
      if (typeof value === "string" && value.length > DEFAULTS.maxParamValueLength) {
        console.error(`[AnalyticsSdk] event_params.${key} was omitted because its value exceeds ${DEFAULTS.maxParamValueLength} characters.`);
        continue;
      }
      if (Object.keys(accepted).length >= DEFAULTS.maxEventParams) {
        console.error(`[AnalyticsSdk] event_params.${key} was omitted because only ${DEFAULTS.maxEventParams} parameters are allowed.`);
        continue;
      }
      accepted[key] = value;
    }
    return accepted;
  }

  private limitUserProperties(properties: Record<string, string>): Record<string, string> {
    this.validateRecord(properties, "user_properties");
    const safeProperties = this.removeReservedKeys(properties, "userProperties");
    const accepted: Record<string, string> = {};
    for (const [key, value] of Object.entries(safeProperties)) {
      if (!new RegExp(`^[a-z][a-z0-9_]{0,${DEFAULTS.maxPropertyKeyLength - 1}}$`).test(key)) {
        console.error(`[AnalyticsSdk] user_properties.${key} was omitted because its key must start with a lowercase letter, contain only lowercase letters, numbers, or underscores, and not exceed ${DEFAULTS.maxPropertyKeyLength} characters.`);
        continue;
      }
      if (typeof value !== "string") {
        console.error(`[AnalyticsSdk] user_properties.${key} was omitted because its value must be a string.`);
        continue;
      }
      if (value.length > DEFAULTS.maxPropertyValueLength) {
        console.error(`[AnalyticsSdk] user_properties.${key} was omitted because its value exceeds ${DEFAULTS.maxPropertyValueLength} characters.`);
        continue;
      }
      if (Object.keys(accepted).length >= DEFAULTS.maxUserProperties) {
        console.error(`[AnalyticsSdk] user_properties.${key} was omitted because only ${DEFAULTS.maxUserProperties} properties are allowed.`);
        continue;
      }
      accepted[key] = value;
    }
    return accepted;
  }

  private removeReservedKeys<T>(
    values: Record<string, T>,
    source: "eventParams" | "userProperties",
  ): Record<string, T> {
    return Object.fromEntries(
      Object.entries(values).filter(([key]) => {
        const normalizedKey = key.replace(/_/g, "").toLowerCase();
        if (!NORMALIZED_RESERVED_ANALYTICS_KEYS.has(normalizedKey)) return true;
        console.error(
          `[AnalyticsSdk] The sensitive key "${key}" in ${source} was omitted and must not be sent to analytics.`,
        );
        return false;
      }),
    ) as Record<string, T>;
  }

  private createEventId(): string {
    return typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private getSessionTimeout(): number {
    const storedTimeout = Number(sessionStorage.getItem(SESSION_TIMEOUT_KEY));
    return Number.isFinite(storedTimeout) && storedTimeout > 0 ? storedTimeout : DEFAULTS.sessionTimeoutMs;
  }

  private clearCurrentSession(): void {
    sessionStorage.removeItem(SESSION_ID_KEY);
    sessionStorage.removeItem(SESSION_LAST_ACTIVE_KEY);
    sessionStorage.removeItem(SESSION_TIMEOUT_KEY);
  }

  private saveSessionTimeout(sessionTimeoutMs: number | undefined): void {
    if (sessionTimeoutMs !== undefined && Number.isFinite(sessionTimeoutMs) && sessionTimeoutMs > 0) {
      sessionStorage.setItem(SESSION_TIMEOUT_KEY, String(sessionTimeoutMs));
    }
  }
}
