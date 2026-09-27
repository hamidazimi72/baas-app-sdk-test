interface RequestOptions {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    signal?: AbortSignal;
}

interface CoreSdkConfig {
    baseUrl: string;
    apiKey: string;
    /**
     * Push WebSocket host. The SDK appends :7071/ws/push.
     * Example: wss://api.example.com
     */
    webSocketUrl?: string;
}
interface DeviceData {
    token: string;
    installationId: string;
    expiresAt: number;
    status: string;
}
interface DeviceRegisterResponse {
    success: boolean;
    data?: DeviceData;
    [key: string]: unknown;
}
interface DeviceTokenRefreshResponse {
    success: boolean;
    data?: DeviceData;
    [key: string]: unknown;
}
interface DeviceDeactivateResponse {
    success: boolean;
    [key: string]: unknown;
}
declare class CoreSdk {
    private static readonly defaultWebSocketPort;
    private static readonly webSocketPath;
    readonly SDK_VERSION = "1.0.0";
    readonly apiKey: string;
    private readonly baseUrl;
    private readonly webSocketUrl;
    private readonly httpClient;
    private readonly storage;
    private readonly deviceInfo;
    private initializationPromise;
    private tokenExpiryCheckPromise;
    private tokenRefreshPromise;
    constructor(config: CoreSdkConfig);
    private getApiKeyHeader;
    private areDeviceInfoEqual;
    deviceRegister(payload?: {
        region?: string;
        gender?: string;
        age?: number;
        browser?: string;
        browserVersion?: string;
        device?: "Mobile" | "Desktop";
        deviceTimezone?: string | null;
        deviceLanguage?: string | null;
    }): Promise<DeviceRegisterResponse>;
    deviceUpdate(payload?: {
        userId?: string;
        region?: string;
        gender?: string;
        age?: number;
        browser?: string;
        browserVersion?: string;
        device?: "Mobile" | "Desktop";
        deviceTimezone?: string | null;
        deviceLanguage?: string | null;
    }): Promise<Record<string, any>>;
    /** Refreshes the existing installation token and persists its token and expiration. */
    refreshInstallationToken(): Promise<DeviceTokenRefreshResponse>;
    private refreshInstallationTokenInternal;
    private refreshInstallationTokenIfNeeded;
    private checkInstallationTokenExpiry;
    /** Deactivates the existing device and clears its installation token on success. */
    deactivateDevice(): Promise<DeviceDeactivateResponse | null>;
    getWebSocketUrl(): string;
    private assertWebSocketUrl;
    ensureInstallationToken(): Promise<string>;
    initializeApp(): Promise<void>;
    private initializeAppInternal;
    getInstallationToken(): Promise<string | null>;
    clearInstallationToken(): Promise<void>;
    getAuthToken(): Promise<string | null>;
    setAuthToken(token: string): Promise<void>;
    clearAuthToken(): Promise<void>;
    request<T = unknown>(options: RequestOptions): Promise<T>;
}

interface AnalyticsClientDiagnostics {
    dropped_expired?: number;
    dropped_future_clock?: number;
    dropped_queue_overflow?: number;
}

type AnalyticsParamValue = string | number | boolean;
type AnalyticsParams = Record<string, AnalyticsParamValue>;
interface AnalyticsCollectEvent {
    event_name: string;
    event_id: string;
    event_timestamp: number;
    engagement_time_msec?: number;
    event_params?: AnalyticsParams;
}
interface AnalyticsCollectRequest {
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
interface AnalyticsCollectResponse {
    success: boolean;
    data?: {
        accepted: number;
        rejected: number;
        sessionTimeoutMs?: number;
    };
    error?: string;
}
type AnalyticsIdentityAction = "setUserId" | "clearUserId" | "resetIdentity";
interface AnalyticsIdentityResponse {
    success: boolean;
    data?: {
        action: AnalyticsIdentityAction;
    };
    error?: string;
}
interface AnalyticsSdkConfig {
    appVersion: string;
    environment?: string;
}
declare class AnalyticsSdk {
    private readonly core;
    private readonly appVersion;
    private readonly environment;
    private readonly storage;
    private identity;
    private flushTimer;
    private flushPromise;
    private queueGeneration;
    private collectionPreferenceVersion;
    private collectionPreferenceOverride;
    private analyticsCollectionEnabled;
    private analyticsUploadPaused;
    private activeCollectController;
    private retryTimer;
    private cancelRetryWait;
    private ready;
    private automaticCollectionEnabled;
    private automaticScreenTrackingEnabled;
    private visibleSince;
    private scrollReported;
    private lastPageViewUrl;
    private scrollThrottleTimer;
    private readonly startedForms;
    private readonly startedVideos;
    private readonly videoProgress;
    private originalPushState;
    private originalReplaceState;
    private patchedPushState;
    private patchedReplaceState;
    constructor(core: CoreSdk, config: AnalyticsSdkConfig);
    private initialize;
    logEvent(eventName: string, eventParams?: AnalyticsParams, engagementTimeMsec?: number): Promise<void>;
    setUserProperties(properties: Record<string, string>): Promise<void>;
    clearUserProperties(): Promise<void>;
    setUserId(userId: string): Promise<AnalyticsIdentityResponse>;
    clearUserId(): Promise<AnalyticsIdentityResponse>;
    resetIdentity(): Promise<AnalyticsIdentityResponse>;
    setAutomaticCollection(enabled: boolean): void;
    setAutomaticScreenTracking(enabled: boolean): void;
    setAnalyticsCollectionEnabled(enabled: boolean): Promise<void>;
    flush(): Promise<void>;
    destroy(): void;
    private flushInternal;
    private flushInBackground;
    private waitForRetry;
    private clearRetryTimer;
    private getHttpErrorStatus;
    private validateBatch;
    private createBatch;
    private enqueueEvent;
    private pruneEvents;
    private identityRequest;
    private requireInstallationToken;
    private initializeFirstVisitAndSession;
    private attachListeners;
    private readonly handleInitialPageView;
    private readonly handleOnline;
    private readonly handlePageHide;
    private readonly handleRouteChange;
    private trackPageView;
    private readonly handleVisibilityChange;
    private readonly handleScroll;
    private evaluateScrollDepth;
    private readonly handleClick;
    private readonly handleFocusIn;
    private readonly handleSubmit;
    private readonly handleVideoPlay;
    private readonly handleVideoTimeUpdate;
    private readonly handleVideoEnded;
    private recordEngagement;
    private enqueueAutomatic;
    private patchHistory;
    private recordEngagementAndFlush;
    private restoreHistory;
    private clearScrollThrottle;
    private flushAfterPending;
    private validateRequiredString;
    private validateRecord;
    private validateEnvironment;
    private validateQueuedEvent;
    private validateEventName;
    private limitParams;
    private limitUserProperties;
    private removeReservedKeys;
    private createEventId;
    private getSessionTimeout;
    private clearCurrentSession;
    private saveSessionTimeout;
}

export { AnalyticsSdk };
export type { AnalyticsClientDiagnostics, AnalyticsCollectEvent, AnalyticsCollectRequest, AnalyticsCollectResponse, AnalyticsIdentityAction, AnalyticsIdentityResponse, AnalyticsParamValue, AnalyticsParams, AnalyticsSdkConfig };
