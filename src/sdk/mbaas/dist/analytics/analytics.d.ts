interface RequestOptions {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
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
    status: string;
}
interface DeviceRegisterResponse {
    success: boolean;
    data?: DeviceData;
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

type AnalyticsParamValue = string | number | boolean;
type AnalyticsParams = Record<string, AnalyticsParamValue>;
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
}
declare class AnalyticsSdk {
    private readonly core;
    private readonly appVersion;
    private readonly storage;
    private identity;
    private flushTimer;
    private flushPromise;
    private ready;
    private automaticCollectionEnabled;
    private automaticScreenTrackingEnabled;
    private visibleSince;
    private scrollReported;
    private readonly startedForms;
    private readonly videoProgress;
    constructor(core: CoreSdk, config: AnalyticsSdkConfig);
    private initialize;
    logEvent(eventName: string, eventParams?: AnalyticsParams, engagementTimeMsec?: number): Promise<void>;
    setUserProperties(properties: Record<string, string>): Promise<void>;
    setUserId(userId: string): Promise<AnalyticsIdentityResponse>;
    clearUserId(): Promise<AnalyticsIdentityResponse>;
    resetIdentity(): Promise<AnalyticsIdentityResponse>;
    setAutomaticCollection(enabled: boolean): void;
    setAutomaticScreenTracking(enabled: boolean): void;
    flush(): Promise<void>;
    destroy(): void;
    private flushInternal;
    private createBatch;
    private enqueueEvent;
    private identityRequest;
    private requireInstallationToken;
    private initializeFirstVisitAndSession;
    private attachListeners;
    private readonly handleInitialPageView;
    private readonly handleOnline;
    private readonly handlePageHide;
    private readonly handleRouteChange;
    private readonly handleVisibilityChange;
    private readonly handleScroll;
    private readonly handleClick;
    private readonly handleFocusIn;
    private readonly handleSubmit;
    private readonly handleVideoPlay;
    private readonly handleVideoTimeUpdate;
    private readonly handleVideoEnded;
    private recordEngagement;
    private enqueueAutomatic;
    private patchHistory;
    private validateEventName;
    private limitParams;
    private limitUserProperties;
    private createEventId;
    private getSessionTimeout;
    private saveSessionTimeout;
}

export { AnalyticsSdk };
export type { AnalyticsCollectResponse, AnalyticsIdentityAction, AnalyticsIdentityResponse, AnalyticsParamValue, AnalyticsParams, AnalyticsSdkConfig };
