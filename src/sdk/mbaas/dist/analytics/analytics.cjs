'use strict';

class HttpError extends Error {
    constructor(status, body, statusText = "") {
        super(`HTTP ${status}${statusText ? ` ${statusText}` : ""}`);
        this.name = "HttpError";
        this.status = status;
        this.body = body;
        Object.setPrototypeOf(this, HttpError.prototype);
    }
}

const DIAGNOSTICS_KEY = "client_diagnostics";
const COLLECTION_ENABLED_KEY = "collection_enabled";
const DIAGNOSTICS_FIELDS = ["dropped_expired", "dropped_future_clock", "dropped_queue_overflow"];
const UTF8_ENCODER = new TextEncoder();
function getEventSizeBytes(event) {
    return UTF8_ENCODER.encode(JSON.stringify(event)).byteLength;
}
function normalizeDiagnostics(value) {
    const counters = value !== null && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
    return Object.fromEntries(DIAGNOSTICS_FIELDS.map((field) => {
        const count = counters[field];
        return [field, typeof count === "number" && Number.isFinite(count) && count >= 0 ? count : 0];
    }));
}
const DB_NAME = "mbaas-analytics";
const DB_VERSION = 1;
const EVENTS_STORE = "events";
const METADATA_STORE = "metadata";
class AnalyticsStorage {
    open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(EVENTS_STORE)) {
                    database.createObjectStore(EVENTS_STORE, { keyPath: "eventId" });
                }
                if (!database.objectStoreNames.contains(METADATA_STORE)) {
                    database.createObjectStore(METADATA_STORE);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async addEvent(event) {
        const database = await this.open();
        return this.transaction(database, EVENTS_STORE, "readwrite", (store) => store.put(event));
    }
    async getEvents() {
        const database = await this.open();
        return new Promise((resolve, reject) => {
            const request = database.transaction(EVENTS_STORE, "readonly").objectStore(EVENTS_STORE).getAll();
            request.onsuccess = () => {
                database.close();
                resolve(request.result.sort((a, b) => a.eventTimestamp - b.eventTimestamp));
            };
            request.onerror = () => { database.close(); reject(request.error); };
        });
    }
    async deleteEvents(eventIds) {
        if (!eventIds.length)
            return;
        const database = await this.open();
        return this.transaction(database, EVENTS_STORE, "readwrite", (store) => {
            eventIds.forEach((eventId) => store.delete(eventId));
        });
    }
    async deleteEventsBefore(timestamp) {
        await this.pruneEvents(timestamp);
    }
    async pruneEvents(beforeTimestamp, now, maxQueuedEvents, maxQueueSizeBytes) {
        const database = await this.open();
        return this.writeTransaction(database, [EVENTS_STORE, METADATA_STORE], (transaction) => {
            const eventsStore = transaction.objectStore(EVENTS_STORE);
            const metadataStore = transaction.objectStore(METADATA_STORE);
            const request = eventsStore.getAll();
            request.onsuccess = () => {
                const dropped = normalizeDiagnostics({});
                const retained = [];
                for (const event of request.result) {
                    if (typeof event.eventTimestamp === "number" && event.eventTimestamp < beforeTimestamp) {
                        eventsStore.delete(event.eventId);
                        dropped.dropped_expired++;
                    }
                    else if (now !== undefined && typeof event.eventTimestamp === "number" && event.eventTimestamp > now) {
                        eventsStore.delete(event.eventId);
                        dropped.dropped_future_clock++;
                    }
                    else {
                        retained.push(event);
                    }
                }
                retained.sort((first, second) => first.eventTimestamp - second.eventTimestamp);
                let retainedSizeBytes = maxQueueSizeBytes === undefined
                    ? 0
                    : retained.reduce((total, event) => total + getEventSizeBytes(event), 0);
                let oldestIndex = 0;
                while ((maxQueuedEvents !== undefined && retained.length - oldestIndex > maxQueuedEvents) ||
                    (maxQueueSizeBytes !== undefined && retainedSizeBytes > maxQueueSizeBytes)) {
                    const oldestEvent = retained[oldestIndex++];
                    eventsStore.delete(oldestEvent.eventId);
                    if (maxQueueSizeBytes !== undefined) {
                        retainedSizeBytes -= getEventSizeBytes(oldestEvent);
                    }
                    dropped.dropped_queue_overflow++;
                }
                if (!DIAGNOSTICS_FIELDS.some((field) => dropped[field] > 0))
                    return;
                const metadataRequest = metadataStore.get(DIAGNOSTICS_KEY);
                metadataRequest.onsuccess = () => {
                    const counters = normalizeDiagnostics(metadataRequest.result);
                    DIAGNOSTICS_FIELDS.forEach((field) => { counters[field] += dropped[field]; });
                    metadataStore.put(counters, DIAGNOSTICS_KEY);
                };
            };
        });
    }
    async getClientDiagnostics() {
        return normalizeDiagnostics(await this.getMetadata(DIAGNOSTICS_KEY, {}));
    }
    async completeBatch(eventIds, sentDiagnostics) {
        const database = await this.open();
        return this.writeTransaction(database, [EVENTS_STORE, METADATA_STORE], (transaction) => {
            const eventsStore = transaction.objectStore(EVENTS_STORE);
            eventIds.forEach((eventId) => eventsStore.delete(eventId));
            const metadataStore = transaction.objectStore(METADATA_STORE);
            const request = metadataStore.get(DIAGNOSTICS_KEY);
            request.onsuccess = () => {
                const counters = normalizeDiagnostics(request.result);
                const sent = normalizeDiagnostics(sentDiagnostics);
                // Keep drops recorded while this batch was in flight for the next successful send.
                DIAGNOSTICS_FIELDS.forEach((field) => { counters[field] = Math.max(0, counters[field] - sent[field]); });
                metadataStore.put(counters, DIAGNOSTICS_KEY);
            };
        });
    }
    async clearForIdentityReset() {
        const database = await this.open();
        return this.writeTransaction(database, [EVENTS_STORE, METADATA_STORE], (transaction) => {
            transaction.objectStore(EVENTS_STORE).clear();
            const metadataStore = transaction.objectStore(METADATA_STORE);
            metadataStore.delete(DIAGNOSTICS_KEY);
            metadataStore.delete("identity");
        });
    }
    async getAnalyticsCollectionEnabled() {
        return (await this.getMetadata(COLLECTION_ENABLED_KEY, true)) !== false;
    }
    async setAnalyticsCollectionEnabled(enabled) {
        return this.setMetadata(COLLECTION_ENABLED_KEY, enabled);
    }
    async disableAnalyticsCollection() {
        const database = await this.open();
        return this.writeTransaction(database, [EVENTS_STORE, METADATA_STORE], (transaction) => {
            transaction.objectStore(EVENTS_STORE).clear();
            const metadataStore = transaction.objectStore(METADATA_STORE);
            metadataStore.delete(DIAGNOSTICS_KEY);
            metadataStore.put(false, COLLECTION_ENABLED_KEY);
        });
    }
    async clearStoredIdentity() {
        const database = await this.open();
        return this.transaction(database, METADATA_STORE, "readwrite", (store) => store.delete("identity"));
    }
    async getMetadata(key, fallback) {
        const database = await this.open();
        return new Promise((resolve, reject) => {
            const request = database.transaction(METADATA_STORE, "readonly").objectStore(METADATA_STORE).get(key);
            request.onsuccess = () => { database.close(); resolve(request.result ?? fallback); };
            request.onerror = () => { database.close(); reject(request.error); };
        });
    }
    async setMetadata(key, value) {
        const database = await this.open();
        return this.transaction(database, METADATA_STORE, "readwrite", (store) => store.put(value, key));
    }
    transaction(database, storeName, mode, operation) {
        return this.writeTransaction(database, [storeName], (transaction) => {
            operation(transaction.objectStore(storeName));
        }, mode);
    }
    writeTransaction(database, storeNames, operation, mode = "readwrite") {
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(storeNames, mode);
            transaction.oncomplete = () => { database.close(); resolve(); };
            transaction.onerror = () => { database.close(); reject(transaction.error); };
            transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Analytics storage transaction aborted.")); };
            try {
                operation(transaction);
            }
            catch (error) {
                transaction.abort();
                reject(error);
            }
        });
    }
}

const MAX_QUEUED_EVENTS = 10000;
const MAX_QUEUE_SIZE_BYTES = 5 * 1024 * 1024;
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 60000;
const SCROLL_THROTTLE_MS = 200;
const VIDEO_PROGRESS_CHECKPOINTS = [10, 25, 50, 75];
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
];
const NORMALIZED_RESERVED_ANALYTICS_KEYS = new Set(RESERVED_ANALYTICS_KEYS.map((key) => key.replace(/_/g, "").toLowerCase()));
class AnalyticsSdk {
    constructor(core, config) {
        this.storage = new AnalyticsStorage();
        this.identity = {};
        this.flushTimer = null;
        this.flushPromise = null;
        this.queueGeneration = 0;
        this.collectionPreferenceVersion = 0;
        this.collectionPreferenceOverride = null;
        this.analyticsCollectionEnabled = true;
        this.analyticsUploadPaused = false;
        this.activeCollectController = null;
        this.retryTimer = null;
        this.cancelRetryWait = null;
        this.automaticCollectionEnabled = true;
        this.automaticScreenTrackingEnabled = true;
        this.visibleSince = null;
        this.scrollReported = false;
        this.lastPageViewUrl = null;
        this.scrollThrottleTimer = null;
        this.startedForms = new WeakSet();
        this.startedVideos = new WeakSet();
        this.videoProgress = new WeakMap();
        this.originalPushState = null;
        this.originalReplaceState = null;
        this.patchedPushState = null;
        this.patchedReplaceState = null;
        this.handleInitialPageView = () => {
            this.trackPageView();
        };
        this.handleOnline = () => {
            this.flushInBackground();
        };
        this.handlePageHide = () => {
            this.recordEngagementAndFlush();
        };
        this.handleRouteChange = () => {
            this.trackPageView();
        };
        this.handleVisibilityChange = () => {
            if (!this.analyticsCollectionEnabled)
                return;
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
        this.handleScroll = () => {
            if (this.scrollReported || this.scrollThrottleTimer !== null || !this.automaticCollectionEnabled ||
                !this.automaticScreenTrackingEnabled)
                return;
            this.scrollThrottleTimer = setTimeout(() => {
                this.scrollThrottleTimer = null;
                this.evaluateScrollDepth();
            }, SCROLL_THROTTLE_MS);
        };
        this.handleClick = (event) => {
            if (!this.automaticCollectionEnabled)
                return;
            const target = event.target?.closest("a");
            if (!target || !(target instanceof HTMLAnchorElement))
                return;
            const href = target.href;
            if (!href)
                return;
            const isDownload = target.hasAttribute("download") || DOWNLOAD_FILE_EXTENSION.test(href);
            if (isDownload) {
                void this.enqueueAutomatic("file_download", { file_name: target.download || href.split("/").pop() || "" });
            }
            else if (new URL(href, window.location.href).hostname !== window.location.hostname) {
                void this.enqueueAutomatic("click", { link_url: href });
            }
        };
        this.handleFocusIn = (event) => {
            if (!this.automaticCollectionEnabled)
                return;
            const target = event.target;
            const form = target?.closest("form");
            if (form instanceof HTMLFormElement && !this.startedForms.has(form)) {
                this.startedForms.add(form);
                void this.enqueueAutomatic("form_start");
            }
        };
        this.handleSubmit = (event) => {
            if (this.automaticCollectionEnabled && event.target instanceof HTMLFormElement)
                void this.enqueueAutomatic("form_submit");
        };
        this.handleVideoPlay = (event) => {
            if (this.automaticCollectionEnabled && event.target instanceof HTMLVideoElement &&
                !this.startedVideos.has(event.target)) {
                this.startedVideos.add(event.target);
                void this.enqueueAutomatic("video_start");
            }
        };
        this.handleVideoTimeUpdate = (event) => {
            if (!this.automaticCollectionEnabled || !(event.target instanceof HTMLVideoElement) ||
                !Number.isFinite(event.target.duration) || event.target.duration <= 0)
                return;
            const percent = (event.target.currentTime / event.target.duration) * 100;
            const progress = this.videoProgress.get(event.target) ?? new Set();
            for (const checkpoint of VIDEO_PROGRESS_CHECKPOINTS) {
                if (percent >= checkpoint && !progress.has(checkpoint)) {
                    progress.add(checkpoint);
                    void this.enqueueAutomatic("video_progress", { percent: checkpoint });
                }
            }
            this.videoProgress.set(event.target, progress);
        };
        this.handleVideoEnded = (event) => {
            if (this.automaticCollectionEnabled && event.target instanceof HTMLVideoElement)
                void this.enqueueAutomatic("video_complete");
        };
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
    async initialize() {
        const [, storedCollectionEnabled] = await Promise.all([
            this.storage.clearStoredIdentity(),
            this.storage.getAnalyticsCollectionEnabled(),
        ]);
        this.identity = {};
        this.analyticsCollectionEnabled = this.collectionPreferenceOverride ?? storedCollectionEnabled;
        this.attachListeners();
        if (this.analyticsCollectionEnabled) {
            await this.initializeFirstVisitAndSession();
        }
        else {
            this.clearCurrentSession();
            await this.storage.disableAnalyticsCollection();
        }
        this.flushTimer = setInterval(() => {
            this.flushInBackground();
        }, DEFAULTS.flushIntervalMs);
    }
    async logEvent(eventName, eventParams, engagementTimeMsec) {
        if (!this.analyticsCollectionEnabled)
            return;
        const eventTimestamp = Date.now();
        await this.ready;
        if (!this.analyticsCollectionEnabled)
            return;
        await this.enqueueEvent(eventName, eventParams, engagementTimeMsec, eventTimestamp);
    }
    async setUserProperties(properties) {
        if (!this.analyticsCollectionEnabled)
            return;
        const collectionPreferenceVersion = this.collectionPreferenceVersion;
        await this.ready;
        if (!this.analyticsCollectionEnabled || collectionPreferenceVersion !== this.collectionPreferenceVersion)
            return;
        try {
            this.identity = { ...this.identity, userProperties: this.limitUserProperties(properties) };
        }
        catch (error) {
            console.error("[AnalyticsSdk] User properties were not set because they are invalid.", error);
        }
    }
    async clearUserProperties() {
        await this.ready;
        delete this.identity.userProperties;
    }
    async setUserId(userId) {
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
    async clearUserId() {
        await this.ready;
        const response = await this.identityRequest({ action: "clearUserId" });
        if (response.success) {
            delete this.identity.userId;
        }
        return response;
    }
    async resetIdentity() {
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
    setAutomaticCollection(enabled) {
        this.automaticCollectionEnabled = enabled;
        if (!enabled) {
            this.visibleSince = null;
            this.clearScrollThrottle();
        }
        else if (typeof document !== "undefined" && document.visibilityState !== "hidden") {
            this.visibleSince = Date.now();
        }
    }
    setAutomaticScreenTracking(enabled) {
        this.automaticScreenTrackingEnabled = enabled;
    }
    async setAnalyticsCollectionEnabled(enabled) {
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
        if (preferenceVersion !== this.collectionPreferenceVersion)
            return;
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
    async flush() {
        await this.ready;
        if (!this.analyticsCollectionEnabled || this.analyticsUploadPaused)
            return;
        if (this.flushPromise)
            return this.flushPromise;
        this.flushPromise = this.flushInternal().finally(() => {
            this.flushPromise = null;
        });
        return this.flushPromise;
    }
    destroy() {
        if (this.flushTimer)
            clearInterval(this.flushTimer);
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
    async flushInternal() {
        const queueGeneration = this.queueGeneration;
        // Check required event fields before pruning so missing timestamps cannot be silently discarded.
        (await this.storage.getEvents()).forEach((event) => this.validateQueuedEvent(event));
        await this.pruneEvents();
        const events = await this.storage.getEvents();
        if (!events.length)
            return;
        this.validateBatch(events.slice(0, DEFAULTS.batchSize));
        let token;
        try {
            token = await this.requireInstallationToken();
        }
        catch {
            return;
        }
        for (let index = 0; index < events.length; index += DEFAULTS.batchSize) {
            if (queueGeneration !== this.queueGeneration)
                return;
            let batch = events.slice(index, index + DEFAULTS.batchSize);
            let retryAttempt = 0;
            let tokenRefreshAttempted = false;
            while (batch.length) {
                const diagnostics = await this.storage.getClientDiagnostics();
                // Keep payload validation outside the transport catch so callers receive input errors.
                const body = await this.createBatch(batch, diagnostics);
                // Sample the clock after all awaits, immediately before the HTTP call.
                const sentAt = Date.now();
                const eligible = batch.filter((event) => event.eventTimestamp >= sentAt - DEFAULTS.offlineRetentionMs && event.eventTimestamp <= sentAt);
                if (eligible.length !== batch.length) {
                    // Token lookup, earlier requests, or batch preparation can outlast the time window.
                    await this.pruneEvents();
                    batch = eligible;
                    continue;
                }
                if (queueGeneration !== this.queueGeneration)
                    return;
                let response;
                const controller = typeof AbortController === "undefined" ? null : new AbortController();
                this.activeCollectController = controller;
                try {
                    response = await this.core.request({
                        method: "POST",
                        url: ":8075/api/v1/analytics/collect",
                        headers: { Authorization: `Bearer ${token}` },
                        body: { ...body, sent_at: sentAt },
                        ...(controller ? { signal: controller.signal } : {}),
                    });
                }
                catch (error) {
                    const status = this.getHttpErrorStatus(error);
                    if (status === null)
                        return;
                    if (!this.analyticsCollectionEnabled || queueGeneration !== this.queueGeneration)
                        return;
                    if (status === 400) {
                        await this.storage.deleteEvents(batch.map((event) => event.eventId));
                        console.error("[AnalyticsSdk] Dropped a permanently invalid analytics batch after HTTP 400.", error);
                        break;
                    }
                    if (status === 401) {
                        if (tokenRefreshAttempted)
                            return;
                        tokenRefreshAttempted = true;
                        try {
                            const refreshResponse = await this.core.refreshInstallationToken();
                            if (!refreshResponse.success || !refreshResponse.data?.token)
                                return;
                            token = refreshResponse.data.token;
                        }
                        catch {
                            return;
                        }
                        continue;
                    }
                    if (status === 403) {
                        this.analyticsUploadPaused = true;
                        console.error("[AnalyticsSdk] Analytics uploads were paused for this SDK instance after HTTP 403.", error);
                        return;
                    }
                    if (status === 429 || status === 503) {
                        retryAttempt++;
                        if (!(await this.waitForRetry(retryAttempt, queueGeneration)))
                            return;
                        continue;
                    }
                    return;
                }
                finally {
                    if (this.activeCollectController === controller) {
                        this.activeCollectController = null;
                    }
                }
                if (!response.success)
                    return;
                if (queueGeneration !== this.queueGeneration)
                    return;
                this.saveSessionTimeout(response.data?.sessionTimeoutMs);
                await this.storage.completeBatch(batch.map((event) => event.eventId), diagnostics);
                break;
            }
        }
    }
    flushInBackground() {
        void this.flush().catch((error) => {
            console.error("[AnalyticsSdk] Failed to flush analytics events.", error);
        });
    }
    waitForRetry(attempt, queueGeneration) {
        const exponentialDelay = Math.min(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), RETRY_MAX_DELAY_MS);
        const delay = Math.floor(Math.random() * exponentialDelay);
        return new Promise((resolve) => {
            const finish = (shouldRetry) => {
                if (this.retryTimer !== null)
                    clearTimeout(this.retryTimer);
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
    clearRetryTimer() {
        this.cancelRetryWait?.();
    }
    getHttpErrorStatus(error) {
        if (error instanceof HttpError)
            return error.status;
        if (error !== null && typeof error === "object" && "status" in error) {
            const status = error.status;
            if (typeof status === "number" && Number.isInteger(status))
                return status;
        }
        return null;
    }
    validateBatch(events) {
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
        for (const event of events)
            this.validateQueuedEvent(event);
        return sessionId;
    }
    async createBatch(events, diagnostics = {}) {
        const sessionId = this.validateBatch(events);
        const safeDiagnostics = diagnostics !== null && typeof diagnostics === "object" && !Array.isArray(diagnostics)
            ? diagnostics
            : {};
        const clientDiagnostics = Object.fromEntries(["dropped_expired", "dropped_future_clock", "dropped_queue_overflow"].map((field) => {
            const value = safeDiagnostics[field];
            return [field, typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0];
        }));
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
    async enqueueEvent(eventName, eventParams, engagementTimeMsec, eventTimestamp = Date.now()) {
        if (!this.analyticsCollectionEnabled)
            return;
        const queueGeneration = this.queueGeneration;
        this.validateEventName(eventName);
        const safeEventParams = eventParams === undefined ? undefined : this.limitParams(eventParams);
        const event = {
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
        if ((await this.storage.getEvents()).length >= DEFAULTS.batchSize)
            this.flushInBackground();
    }
    async pruneEvents() {
        const now = Date.now();
        await this.storage.pruneEvents(now - DEFAULTS.offlineRetentionMs, now, MAX_QUEUED_EVENTS, MAX_QUEUE_SIZE_BYTES);
    }
    async identityRequest(body) {
        return this.core.request({
            method: "POST",
            url: ":8075/api/v1/analytics/identity",
            headers: { Authorization: `Bearer ${await this.requireInstallationToken()}` },
            body,
        });
    }
    async requireInstallationToken() {
        let token = await this.core.getInstallationToken();
        if (!token) {
            await this.core.initializeApp();
            token = await this.core.getInstallationToken();
        }
        if (!token)
            throw new Error("AnalyticsSdk requires an installation token.");
        return token;
    }
    async initializeFirstVisitAndSession() {
        if (!this.analyticsCollectionEnabled)
            return;
        if (this.automaticCollectionEnabled && !localStorage.getItem(FIRST_VISIT_KEY)) {
            localStorage.setItem(FIRST_VISIT_KEY, "1");
            await this.enqueueEvent("first_visit");
        }
        if (!this.analyticsCollectionEnabled)
            return;
        const previousActivity = Number(sessionStorage.getItem(SESSION_LAST_ACTIVE_KEY) ?? 0);
        const startsNewSession = !sessionStorage.getItem(SESSION_ID_KEY) || Date.now() - previousActivity > this.getSessionTimeout();
        if (startsNewSession) {
            sessionStorage.setItem(SESSION_ID_KEY, this.createEventId());
            if (this.automaticCollectionEnabled)
                await this.enqueueEvent("session_start");
        }
        if (!this.analyticsCollectionEnabled) {
            this.clearCurrentSession();
            return;
        }
        sessionStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(Date.now()));
        this.visibleSince = this.automaticCollectionEnabled && document.visibilityState !== "hidden" ? Date.now() : null;
        if (!this.automaticCollectionEnabled)
            return;
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", this.handleInitialPageView, { once: true });
        }
        else {
            // initialize() owns this.ready, so enqueueAutomatic() would wait for
            // the promise that is currently waiting for enqueueAutomatic().
            if (this.automaticScreenTrackingEnabled) {
                this.lastPageViewUrl = window.location.href;
                await this.enqueueEvent("page_view");
            }
        }
    }
    attachListeners() {
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
    trackPageView() {
        const currentUrl = window.location.href;
        if (currentUrl === this.lastPageViewUrl)
            return;
        this.lastPageViewUrl = currentUrl;
        this.scrollReported = false;
        void this.enqueueAutomatic("page_view");
    }
    evaluateScrollDepth() {
        if (this.scrollReported || !this.automaticCollectionEnabled || !this.automaticScreenTrackingEnabled)
            return;
        const pageHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
        if (pageHeight > 0 && window.scrollY / pageHeight >= 0.9) {
            this.scrollReported = true;
            void this.enqueueAutomatic("scroll");
        }
    }
    async recordEngagement() {
        if (!this.analyticsCollectionEnabled || !this.automaticCollectionEnabled || this.visibleSince === null)
            return;
        const duration = Date.now() - this.visibleSince;
        this.visibleSince = null;
        if (duration > 0)
            await this.enqueueAutomatic("user_engagement", undefined, duration);
    }
    async enqueueAutomatic(eventName, params, engagement) {
        if (!this.analyticsCollectionEnabled || !this.automaticCollectionEnabled)
            return;
        if ((eventName === "page_view" || eventName === "scroll") && !this.automaticScreenTrackingEnabled)
            return;
        const eventTimestamp = Date.now();
        await this.ready;
        if (!this.analyticsCollectionEnabled || !this.automaticCollectionEnabled)
            return;
        if (eventName === "page_view")
            this.scrollReported = false;
        await this.enqueueEvent(eventName, params, engagement, eventTimestamp);
    }
    patchHistory() {
        this.originalPushState = history.pushState;
        this.originalReplaceState = history.replaceState;
        this.patchedPushState = (...args) => {
            this.originalPushState.apply(history, args);
            this.handleRouteChange();
        };
        this.patchedReplaceState = (...args) => {
            this.originalReplaceState.apply(history, args);
            this.handleRouteChange();
        };
        history.pushState = this.patchedPushState;
        history.replaceState = this.patchedReplaceState;
    }
    recordEngagementAndFlush() {
        void (async () => {
            try {
                await this.recordEngagement();
            }
            catch (error) {
                console.error("[AnalyticsSdk] Failed to enqueue user engagement.", error);
            }
            await this.flushAfterPending();
        })();
    }
    restoreHistory() {
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
    clearScrollThrottle() {
        if (this.scrollThrottleTimer !== null)
            clearTimeout(this.scrollThrottleTimer);
        this.scrollThrottleTimer = null;
    }
    async flushAfterPending() {
        try {
            const pendingFlush = this.flushPromise;
            if (pendingFlush)
                await pendingFlush;
            await this.flush();
        }
        catch (error) {
            console.error("[AnalyticsSdk] Failed to flush analytics events.", error);
        }
    }
    validateRequiredString(value, field, maxLength) {
        if (typeof value !== "string" || value.trim() === "") {
            throw new Error(`${field} is required and must be a non-empty string.`);
        }
        if (maxLength !== undefined && value.length > maxLength) {
            throw new Error(`${field} must not exceed ${maxLength} characters.`);
        }
    }
    validateRecord(value, field) {
        if (value === null || typeof value !== "object" || Array.isArray(value)) {
            throw new Error(`${field} must be an object.`);
        }
    }
    validateEnvironment(environment) {
        if (typeof environment !== "string" || environment.length > DEFAULTS.maxEnvironmentLength) {
            throw new Error(`environment must be a string of at most ${DEFAULTS.maxEnvironmentLength} characters.`);
        }
    }
    validateQueuedEvent(event) {
        this.validateRecord(event, "event");
        this.validateEventName(event.eventName);
        this.validateRequiredString(event.eventId, "event_id", DEFAULTS.maxEventIdLength);
        if (!Number.isSafeInteger(event.eventTimestamp) || event.eventTimestamp < 0) {
            throw new Error("event_timestamp is required and must be a non-negative integer in epoch milliseconds.");
        }
        if (event.engagementTimeMsec !== undefined &&
            (typeof event.engagementTimeMsec !== "number" ||
                !Number.isFinite(event.engagementTimeMsec) ||
                event.engagementTimeMsec < 0)) {
            throw new Error("engagement_time_msec must be a finite non-negative number.");
        }
    }
    validateEventName(eventName) {
        this.validateRequiredString(eventName, "event_name", DEFAULTS.maxEventNameLength);
        if (!new RegExp(`^[a-z][a-z0-9_]{0,${DEFAULTS.maxEventNameLength - 1}}$`).test(eventName) ||
            /^(baas_|mbaas_|xmbaas_)/.test(eventName)) {
            throw new Error("event_name must start with a lowercase letter, contain only lowercase letters, numbers, or underscores, and must not use a reserved prefix.");
        }
    }
    limitParams(params) {
        if (params === null || typeof params !== "object" || Array.isArray(params)) {
            console.error("[AnalyticsSdk] event_params was omitted because it must be an object.");
            return {};
        }
        const safeParams = this.removeReservedKeys(params, "eventParams");
        const accepted = {};
        for (const [key, value] of Object.entries(safeParams)) {
            if (!new RegExp(`^[a-z][a-z0-9_]{0,${DEFAULTS.maxEventParamKeyLength - 1}}$`).test(key)) {
                console.error(`[AnalyticsSdk] event_params.${key} was omitted because its key must start with a lowercase letter, contain only lowercase letters, numbers, or underscores, and not exceed ${DEFAULTS.maxEventParamKeyLength} characters.`);
                continue;
            }
            if (typeof value !== "string" &&
                typeof value !== "boolean" &&
                !(typeof value === "number" && Number.isFinite(value))) {
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
    limitUserProperties(properties) {
        this.validateRecord(properties, "user_properties");
        const safeProperties = this.removeReservedKeys(properties, "userProperties");
        const accepted = {};
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
    removeReservedKeys(values, source) {
        return Object.fromEntries(Object.entries(values).filter(([key]) => {
            const normalizedKey = key.replace(/_/g, "").toLowerCase();
            if (!NORMALIZED_RESERVED_ANALYTICS_KEYS.has(normalizedKey))
                return true;
            console.error(`[AnalyticsSdk] The sensitive key "${key}" in ${source} was omitted and must not be sent to analytics.`);
            return false;
        }));
    }
    createEventId() {
        return typeof globalThis.crypto?.randomUUID === "function"
            ? globalThis.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    getSessionTimeout() {
        const storedTimeout = Number(sessionStorage.getItem(SESSION_TIMEOUT_KEY));
        return Number.isFinite(storedTimeout) && storedTimeout > 0 ? storedTimeout : DEFAULTS.sessionTimeoutMs;
    }
    clearCurrentSession() {
        sessionStorage.removeItem(SESSION_ID_KEY);
        sessionStorage.removeItem(SESSION_LAST_ACTIVE_KEY);
        sessionStorage.removeItem(SESSION_TIMEOUT_KEY);
    }
    saveSessionTimeout(sessionTimeoutMs) {
        if (sessionTimeoutMs !== undefined && Number.isFinite(sessionTimeoutMs) && sessionTimeoutMs > 0) {
            sessionStorage.setItem(SESSION_TIMEOUT_KEY, String(sessionTimeoutMs));
        }
    }
}

exports.AnalyticsSdk = AnalyticsSdk;
