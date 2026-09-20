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
        const events = await this.getEvents();
        await this.deleteEvents(events.filter((event) => event.eventTimestamp < timestamp).map((event) => event.eventId));
    }
    async getIdentity() {
        return this.getMetadata("identity", {});
    }
    async setIdentity(identity) {
        return this.setMetadata("identity", identity);
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
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(storeName, mode);
            operation(transaction.objectStore(storeName));
            transaction.oncomplete = () => { database.close(); resolve(); };
            transaction.onerror = () => { database.close(); reject(transaction.error); };
        });
    }
}

const DEFAULTS = {
    // batchSize: 100,
    batchSize: 10,
    // flushIntervalMs: 60 * 60 * 1000,
    flushIntervalMs: 5 * 60 * 1000,
    offlineRetentionMs: 72 * 60 * 60 * 1000,
    sessionTimeoutMs: 30 * 60 * 1000,
    maxEventNameLength: 40,
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
class AnalyticsSdk {
    constructor(core, config) {
        this.storage = new AnalyticsStorage();
        this.identity = {};
        this.flushTimer = null;
        this.flushPromise = null;
        this.automaticCollectionEnabled = true;
        this.automaticScreenTrackingEnabled = true;
        this.visibleSince = null;
        this.scrollReported = false;
        this.startedForms = new WeakSet();
        this.videoProgress = new WeakMap();
        this.handleInitialPageView = () => {
            void this.enqueueAutomatic("page_view");
        };
        this.handleOnline = () => {
            void this.flush();
        };
        this.handlePageHide = () => {
            void this.flush();
        };
        this.handleRouteChange = () => {
            void this.enqueueAutomatic("page_view");
        };
        this.handleVisibilityChange = () => {
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
        this.handleScroll = () => {
            if (this.scrollReported || !this.automaticScreenTrackingEnabled)
                return;
            const pageHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
            if (pageHeight > 0 && window.scrollY / pageHeight >= 0.9) {
                this.scrollReported = true;
                void this.enqueueAutomatic("scroll");
            }
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
            const isDownload = /\.(pdf|zip|docx?|xlsx?|csv|txt|jpg|jpeg|png|gif)(?:$|[?#])/i.test(href);
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
            if (this.automaticCollectionEnabled && event.target instanceof HTMLVideoElement)
                void this.enqueueAutomatic("video_start");
        };
        this.handleVideoTimeUpdate = (event) => {
            if (!this.automaticCollectionEnabled || !(event.target instanceof HTMLVideoElement) || !event.target.duration)
                return;
            const percent = Math.floor(((event.target.currentTime / event.target.duration) * 100) / 25) * 25;
            if (![25, 50, 75].includes(percent))
                return;
            const progress = this.videoProgress.get(event.target) ?? new Set();
            if (!progress.has(percent)) {
                progress.add(percent);
                this.videoProgress.set(event.target, progress);
                void this.enqueueAutomatic("video_progress", { percent });
            }
        };
        this.handleVideoEnded = (event) => {
            if (this.automaticCollectionEnabled && event.target instanceof HTMLVideoElement)
                void this.enqueueAutomatic("video_complete");
        };
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
    async initialize() {
        this.identity = await this.storage.getIdentity();
        this.attachListeners();
        await this.initializeFirstVisitAndSession();
        this.flushTimer = setInterval(() => {
            void this.flush();
        }, DEFAULTS.flushIntervalMs);
    }
    async logEvent(eventName, eventParams, engagementTimeMsec) {
        await this.ready;
        await this.enqueueEvent(eventName, eventParams, engagementTimeMsec);
    }
    async setUserProperties(properties) {
        await this.ready;
        this.identity.userProperties = this.limitUserProperties(properties);
        await this.storage.setIdentity(this.identity);
    }
    async setUserId(userId) {
        await this.ready;
        if (!userId)
            throw new Error("userId is required.");
        const response = await this.identityRequest({ action: "setUserId", userId });
        if (response.success) {
            this.identity.userId = userId;
            await this.storage.setIdentity(this.identity);
        }
        return response;
    }
    async clearUserId() {
        await this.ready;
        const response = await this.identityRequest({ action: "clearUserId" });
        if (response.success) {
            delete this.identity.userId;
            await this.storage.setIdentity(this.identity);
        }
        return response;
    }
    async resetIdentity() {
        await this.ready;
        const response = await this.identityRequest({ action: "resetIdentity" });
        if (response.success) {
            this.identity = {};
            await this.storage.setIdentity(this.identity);
        }
        return response;
    }
    setAutomaticCollection(enabled) {
        this.automaticCollectionEnabled = enabled;
    }
    setAutomaticScreenTracking(enabled) {
        this.automaticScreenTrackingEnabled = enabled;
    }
    async flush() {
        await this.ready;
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
    async flushInternal() {
        await this.storage.deleteEventsBefore(Date.now() - DEFAULTS.offlineRetentionMs);
        const events = await this.storage.getEvents();
        if (!events.length)
            return;
        let token;
        try {
            token = await this.requireInstallationToken();
        }
        catch {
            return;
        }
        for (let index = 0; index < events.length; index += DEFAULTS.batchSize) {
            const batch = events.slice(index, index + DEFAULTS.batchSize);
            let response;
            try {
                response = await this.core.request({
                    method: "POST",
                    url: ":8075/api/v1/analytics/collect",
                    headers: { Authorization: `Bearer ${token}` },
                    body: await this.createBatch(batch),
                });
            }
            catch {
                return;
            }
            if (!response.success)
                return;
            this.saveSessionTimeout(response.data?.sessionTimeoutMs);
            await this.storage.deleteEvents(batch.map((event) => event.eventId));
        }
    }
    async createBatch(events) {
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
    async enqueueEvent(eventName, eventParams, engagementTimeMsec) {
        this.validateEventName(eventName);
        const event = {
            eventId: this.createEventId(),
            eventName,
            eventTimestamp: Date.now(),
            ...(engagementTimeMsec === undefined ? {} : { engagementTimeMsec }),
            ...(eventParams ? { eventParams: this.limitParams(eventParams) } : {}),
        };
        await this.storage.deleteEventsBefore(Date.now() - DEFAULTS.offlineRetentionMs);
        await this.storage.addEvent(event);
        sessionStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(Date.now()));
        if ((await this.storage.getEvents()).length >= DEFAULTS.batchSize)
            void this.flush();
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
        }
        else {
            // initialize() owns this.ready, so enqueueAutomatic() would wait for
            // the promise that is currently waiting for enqueueAutomatic().
            await this.enqueueEvent("page_view");
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
        this.patchHistory();
    }
    recordEngagement() {
        if (!this.automaticCollectionEnabled || this.visibleSince === null)
            return;
        const duration = Date.now() - this.visibleSince;
        this.visibleSince = null;
        if (duration > 0)
            void this.enqueueAutomatic("user_engagement", undefined, duration);
    }
    async enqueueAutomatic(eventName, params, engagement) {
        if (!this.automaticCollectionEnabled)
            return;
        if ((eventName === "page_view" || eventName === "scroll") && !this.automaticScreenTrackingEnabled)
            return;
        await this.ready;
        if (eventName === "page_view")
            this.scrollReported = false;
        await this.enqueueEvent(eventName, params, engagement);
    }
    patchHistory() {
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
    validateEventName(eventName) {
        if (!new RegExp(`^[A-Za-z][A-Za-z0-9_]{0,${DEFAULTS.maxEventNameLength - 1}}$`).test(eventName) ||
            /^(firebase_|google_|ga_)/.test(eventName)) {
            throw new Error("event_name is invalid.");
        }
    }
    limitParams(params) {
        return Object.fromEntries(Object.entries(params)
            .slice(0, DEFAULTS.maxEventParams)
            .map(([key, value]) => [
            key.slice(0, DEFAULTS.maxPropertyKeyLength),
            typeof value === "string" ? value.slice(0, DEFAULTS.maxParamValueLength) : value,
        ]));
    }
    limitUserProperties(properties) {
        return Object.fromEntries(Object.entries(properties)
            .slice(0, DEFAULTS.maxUserProperties)
            .map(([key, value]) => [
            key.slice(0, DEFAULTS.maxPropertyKeyLength),
            value.slice(0, DEFAULTS.maxPropertyValueLength),
        ]));
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
    saveSessionTimeout(sessionTimeoutMs) {
        if (sessionTimeoutMs !== undefined && Number.isFinite(sessionTimeoutMs) && sessionTimeoutMs > 0) {
            sessionStorage.setItem(SESSION_TIMEOUT_KEY, String(sessionTimeoutMs));
        }
    }
}

export { AnalyticsSdk };
