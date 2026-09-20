import { CoreSdk } from "../core/CoreSdk.js";
import { AnalyticsIdentity, AnalyticsStorage, QueuedAnalyticsEvent } from "./AnalyticsStorage.js";

export type AnalyticsParamValue = string | number | boolean;
export type AnalyticsParams = Record<string, AnalyticsParamValue>;

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
}

const DEFAULTS = {
  // batchSize: 100,
  batchSize: 10,
  // flushIntervalMs: 60 * 60 * 1000,
  flushIntervalMs: 5 * 60 * 1000,
  offlineRetentionMs: 72 * 60 * 60 * 1000,
  sessionTimeoutMs: 30 * 60 * 1000,
  maxEventNameLength: 40,
  maxEventIdLength: 128,
  maxEventParams: 25,
  maxUserProperties: 25,
  maxPropertyKeyLength: 24,
  maxPropertyValueLength: 36,
  maxParamValueLength: 100,
};

const FIRST_VISIT_KEY = "mbaas:analytics:first_visit";
const SESSION_ID_KEY = "mbaas:analytics:session_id";
const SESSION_LAST_ACTIVE_KEY = "mbaas:analytics:session_last_active";
const SESSION_TIMEOUT_KEY = "mbaas:analytics:session_timeout_ms";

export class AnalyticsSdk {
  private readonly core: CoreSdk;
  private readonly appVersion: string;
  private readonly storage = new AnalyticsStorage();
  private identity: AnalyticsIdentity = {};
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushPromise: Promise<void> | null = null;
  private ready: Promise<void>;
  private automaticCollectionEnabled = true;
  private automaticScreenTrackingEnabled = true;
  private visibleSince: number | null = null;
  private scrollReported = false;
  private readonly startedForms = new WeakSet<HTMLFormElement>();
  private readonly videoProgress = new WeakMap<HTMLVideoElement, Set<number>>();

  constructor(core: CoreSdk, config: AnalyticsSdkConfig) {
    if (!core || typeof core.request !== "function") {
      throw new Error("AnalyticsSdk requires a valid CoreSdk instance.");
    }
    if (!config || typeof config.appVersion !== "string" || !config.appVersion) {
      throw new Error("AnalyticsSdk appVersion is required and must be a string.");
    }
    this.core = core;
    this.appVersion = config.appVersion;
    this.ready = this.initialize();
  }

  private async initialize(): Promise<void> {
    this.identity = await this.storage.getIdentity();
    this.attachListeners();
    await this.initializeFirstVisitAndSession();
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, DEFAULTS.flushIntervalMs);
  }

  async logEvent(eventName: string, eventParams?: AnalyticsParams, engagementTimeMsec?: number): Promise<void> {
    await this.ready;
    await this.enqueueEvent(eventName, eventParams, engagementTimeMsec);
  }

  async setUserProperties(properties: Record<string, string>): Promise<void> {
    await this.ready;
    this.identity.userProperties = this.limitUserProperties(properties);
    await this.storage.setIdentity(this.identity);
  }

  async setUserId(userId: string): Promise<AnalyticsIdentityResponse> {
    await this.ready;
    if (!userId) throw new Error("userId is required.");
    const response = await this.identityRequest({ action: "setUserId", userId });
    if (response.success) {
      this.identity.userId = userId;
      await this.storage.setIdentity(this.identity);
    }
    return response;
  }

  async clearUserId(): Promise<AnalyticsIdentityResponse> {
    await this.ready;
    const response = await this.identityRequest({ action: "clearUserId" });
    if (response.success) {
      delete this.identity.userId;
      await this.storage.setIdentity(this.identity);
    }
    return response;
  }

  async resetIdentity(): Promise<AnalyticsIdentityResponse> {
    await this.ready;
    const response = await this.identityRequest({ action: "resetIdentity" });
    if (response.success) {
      this.identity = {};
      await this.storage.setIdentity(this.identity);
    }
    return response;
  }

  setAutomaticCollection(enabled: boolean): void {
    this.automaticCollectionEnabled = enabled;
  }

  setAutomaticScreenTracking(enabled: boolean): void {
    this.automaticScreenTrackingEnabled = enabled;
  }

  async flush(): Promise<void> {
    await this.ready;
    if (this.flushPromise) return this.flushPromise;
    this.flushPromise = this.flushInternal().finally(() => {
      this.flushPromise = null;
    });
    return this.flushPromise;
  }

  destroy(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = null;
    if (typeof document !== "undefined") {
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
    }
  }

  private async flushInternal(): Promise<void> {
    await this.storage.deleteEventsBefore(Date.now() - DEFAULTS.offlineRetentionMs);
    const events = await this.storage.getEvents();
    if (!events.length) return;
    let token: string;
    try {
      token = await this.requireInstallationToken();
    } catch {
      return;
    }

    for (let index = 0; index < events.length; index += DEFAULTS.batchSize) {
      const batch = events.slice(index, index + DEFAULTS.batchSize);
      let response: AnalyticsCollectResponse;
      try {
        response = await this.core.request<AnalyticsCollectResponse>({
          method: "POST",
          url: ":8075/api/v1/analytics/collect",
          headers: { Authorization: `Bearer ${token}` },
          body: await this.createBatch(batch),
        });
      } catch {
        return;
      }
      if (!response.success) return;
      this.saveSessionTimeout(response.data?.sessionTimeoutMs);
      await this.storage.deleteEvents(batch.map((event) => event.eventId));
    }
  }

  private async createBatch(events: QueuedAnalyticsEvent[]): Promise<Record<string, unknown>> {
    const sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    return {
      ...(this.identity.userId ? { user_id: this.identity.userId } : {}),
      platform: "WEB",
      sdk_version: this.core.SDK_VERSION,
      app_version: this.appVersion,
      ...(sessionId ? { session_id: sessionId } : {}),
      ...(this.identity.userProperties ? { user_properties: this.identity.userProperties } : {}),
      events: events.map((event) => ({
        event_name: event.eventName,
        event_id: event.eventId,
        event_timestamp: event.eventTimestamp,
        ...(event.engagementTimeMsec === undefined ? {} : { engagement_time_msec: event.engagementTimeMsec }),
        ...(event.eventParams ? { event_params: event.eventParams } : {}),
      })),
    };
  }

  private async enqueueEvent(
    eventName: string,
    eventParams?: AnalyticsParams,
    engagementTimeMsec?: number,
  ): Promise<void> {
    this.validateEventName(eventName);
    const event: QueuedAnalyticsEvent = {
      eventId: this.createEventId(),
      eventName,
      eventTimestamp: Date.now(),
      ...(engagementTimeMsec === undefined ? {} : { engagementTimeMsec }),
      ...(eventParams ? { eventParams: this.limitParams(eventParams) } : {}),
    };
    await this.storage.deleteEventsBefore(Date.now() - DEFAULTS.offlineRetentionMs);
    await this.storage.addEvent(event);
    sessionStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(Date.now()));
    if ((await this.storage.getEvents()).length >= DEFAULTS.batchSize) void this.flush();
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
    if (!localStorage.getItem(FIRST_VISIT_KEY)) {
      localStorage.setItem(FIRST_VISIT_KEY, "1");
      await this.enqueueEvent("first_visit");
    }
    const previousActivity = Number(sessionStorage.getItem(SESSION_LAST_ACTIVE_KEY) ?? 0);
    if (!sessionStorage.getItem(SESSION_ID_KEY) || Date.now() - previousActivity > this.getSessionTimeout()) {
      sessionStorage.setItem(SESSION_ID_KEY, this.createEventId());
      await this.enqueueEvent("session_start");
    }
    sessionStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(Date.now()));
    this.visibleSince = document.visibilityState === "hidden" ? null : Date.now();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", this.handleInitialPageView, { once: true });
    } else {
      // initialize() owns this.ready, so enqueueAutomatic() would wait for
      // the promise that is currently waiting for enqueueAutomatic().
      await this.enqueueEvent("page_view");
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
    this.patchHistory();
  }

  private readonly handleInitialPageView = (): void => {
    void this.enqueueAutomatic("page_view");
  };
  private readonly handleOnline = (): void => {
    void this.flush();
  };
  private readonly handlePageHide = (): void => {
    void this.flush();
  };
  private readonly handleRouteChange = (): void => {
    void this.enqueueAutomatic("page_view");
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === "visible") {
      const last = Number(sessionStorage.getItem(SESSION_LAST_ACTIVE_KEY) ?? 0);
      if (Date.now() - last > this.getSessionTimeout()) {
        sessionStorage.setItem(SESSION_ID_KEY, this.createEventId());
        void this.enqueueAutomatic("session_start");
      }
      this.visibleSince = Date.now();
      return;
    }
    this.recordEngagement();
    void this.flush();
  };

  private readonly handleScroll = (): void => {
    if (this.scrollReported || !this.automaticScreenTrackingEnabled) return;
    const pageHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
    if (pageHeight > 0 && window.scrollY / pageHeight >= 0.9) {
      this.scrollReported = true;
      void this.enqueueAutomatic("scroll");
    }
  };

  private readonly handleClick = (event: MouseEvent): void => {
    if (!this.automaticCollectionEnabled) return;
    const target = (event.target as Element | null)?.closest("a");
    if (!target || !(target instanceof HTMLAnchorElement)) return;
    const href = target.href;
    if (!href) return;
    const isDownload = /\.(pdf|zip|docx?|xlsx?|csv|txt|jpg|jpeg|png|gif)(?:$|[?#])/i.test(href);
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
    if (this.automaticCollectionEnabled && event.target instanceof HTMLVideoElement)
      void this.enqueueAutomatic("video_start");
  };

  private readonly handleVideoTimeUpdate = (event: Event): void => {
    if (!this.automaticCollectionEnabled || !(event.target instanceof HTMLVideoElement) || !event.target.duration)
      return;
    const percent = Math.floor(((event.target.currentTime / event.target.duration) * 100) / 25) * 25;
    if (![25, 50, 75].includes(percent)) return;
    const progress = this.videoProgress.get(event.target) ?? new Set<number>();
    if (!progress.has(percent)) {
      progress.add(percent);
      this.videoProgress.set(event.target, progress);
      void this.enqueueAutomatic("video_progress", { percent });
    }
  };

  private readonly handleVideoEnded = (event: Event): void => {
    if (this.automaticCollectionEnabled && event.target instanceof HTMLVideoElement)
      void this.enqueueAutomatic("video_complete");
  };

  private recordEngagement(): void {
    if (!this.automaticCollectionEnabled || this.visibleSince === null) return;
    const duration = Date.now() - this.visibleSince;
    this.visibleSince = null;
    if (duration > 0) void this.enqueueAutomatic("user_engagement", undefined, duration);
  }

  private async enqueueAutomatic(eventName: string, params?: AnalyticsParams, engagement?: number): Promise<void> {
    if (!this.automaticCollectionEnabled) return;
    if ((eventName === "page_view" || eventName === "scroll") && !this.automaticScreenTrackingEnabled) return;
    await this.ready;
    if (eventName === "page_view") this.scrollReported = false;
    await this.enqueueEvent(eventName, params, engagement);
  }

  private patchHistory(): void {
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);
    history.pushState = (...args) => {
      originalPushState(...args);
      this.handleRouteChange();
    };
    history.replaceState = (...args) => {
      originalReplaceState(...args);
      this.handleRouteChange();
    };
  }

  private validateEventName(eventName: string): void {
    if (
      !new RegExp(`^[A-Za-z][A-Za-z0-9_]{0,${DEFAULTS.maxEventNameLength - 1}}$`).test(eventName) ||
      /^(firebase_|google_|ga_)/.test(eventName)
    ) {
      throw new Error("event_name is invalid.");
    }
  }

  private limitParams(params: AnalyticsParams): AnalyticsParams {
    return Object.fromEntries(
      Object.entries(params)
        .slice(0, DEFAULTS.maxEventParams)
        .map(([key, value]) => [
          key.slice(0, DEFAULTS.maxPropertyKeyLength),
          typeof value === "string" ? value.slice(0, DEFAULTS.maxParamValueLength) : value,
        ]),
    );
  }

  private limitUserProperties(properties: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(properties)
        .slice(0, DEFAULTS.maxUserProperties)
        .map(([key, value]) => [
          key.slice(0, DEFAULTS.maxPropertyKeyLength),
          value.slice(0, DEFAULTS.maxPropertyValueLength),
        ]),
    );
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

  private saveSessionTimeout(sessionTimeoutMs: number | undefined): void {
    if (sessionTimeoutMs !== undefined && Number.isFinite(sessionTimeoutMs) && sessionTimeoutMs > 0) {
      sessionStorage.setItem(SESSION_TIMEOUT_KEY, String(sessionTimeoutMs));
    }
  }
}
