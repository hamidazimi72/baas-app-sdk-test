interface RequestOptions {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
}
declare class HttpError extends Error {
    readonly status: number;
    readonly body: unknown;
    constructor(status: number, body: unknown, statusText?: string);
}
declare class FetchHttpClient {
    request<T = unknown>({ method, url, headers, body }: RequestOptions): Promise<T>;
    private parseResponseBody;
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

type DeviceInfoData = {
    browser: string;
    browserVersion: string;
    device: "Mobile" | "Desktop";
    deviceTimezone: string | null;
    deviceLanguage: string | null;
};

declare class BrowserStorage {
    private readonly prefix;
    constructor(prefix?: string);
    private get installationTokenKey();
    private get authTokenKey();
    private get deviceInfoKey();
    private get sessionStartKey();
    getInstallationToken(): Promise<string | null>;
    setInstallationToken(token: string): Promise<void>;
    clearInstallationToken(): Promise<void>;
    getAuthToken(): Promise<string | null>;
    setAuthToken(token: string): Promise<void>;
    clearAuthToken(): Promise<void>;
    getDeviceInfo(): Promise<DeviceInfoData | null>;
    setDeviceInfo(deviceInfo: DeviceInfoData): Promise<void>;
    getSessionStart(): Promise<string | null>;
    setSessionStart(value?: string): Promise<void>;
}

interface AuthTokenResponse {
    success: boolean;
    data: {
        token: string;
        tokenId: string;
        userId: string;
        appId: string;
        lastLoginSuccess: number;
        lastLoginFailed: number | null;
        loginCount: number;
        isAnonymous: boolean;
        isNewUser: boolean;
    };
}
declare class OAuthError extends Error {
    readonly code: string;
    readonly description?: string;
    readonly uri?: string;
    constructor(code: string, description?: string, uri?: string);
}
declare class AuthSdk {
    private readonly core;
    constructor(core: CoreSdk);
    private getAuthHeader;
    private getInstallationTokenHeader;
    private saveTokenFromResponse;
    private getOAuthCode;
    signInWithGoogle(clientId: string, redirectUri: string): void;
    handleGoogleCallback(clientId: string, clientSecret: string, redirectUri: string): Promise<AuthTokenResponse>;
    signInWithMyGov(redirectUri: string): void;
    handleMyGovCallback(): Promise<AuthTokenResponse>;
    registerPhoneSendOtp(payload: {
        phone: string;
    }): Promise<unknown>;
    registerPhoneVerifyOtp(payload: {
        phone: string;
        code: string;
    }): Promise<AuthTokenResponse>;
    registerEmailSendOtp(payload: {
        email: string;
    }): Promise<unknown>;
    registerEmailVerifyOtp(payload: {
        email: string;
        code: string;
        password: string;
    }): Promise<AuthTokenResponse>;
    loginPhoneSendOtp(payload: {
        phone: string;
    }): Promise<unknown>;
    loginPhoneVerifyOtp(payload: {
        phone: string;
        code: string;
    }): Promise<AuthTokenResponse>;
    loginEmailSendOtp(payload: {
        email: string;
        password: string;
    }): Promise<unknown>;
    loginEmailVerifyOtp(payload: {
        email: string;
        code: string;
        password: string;
    }): Promise<AuthTokenResponse>;
    loginAnonymous(payload: Record<string, unknown>): Promise<AuthTokenResponse>;
    loginMyGov(payload: {
        nationalId: string;
        authCode: string;
    }): Promise<AuthTokenResponse>;
    logout(): Promise<unknown>;
    fetchAllSessions(): Promise<unknown>;
    revokeToken(payload: {
        tokenId: string;
    }): Promise<unknown>;
    fetchUser(): Promise<unknown>;
    updateUser(payload: {
        firstName: string;
        lastName: string;
        gender: string;
        birthDate: string;
        province: string;
        city: string;
        address: string;
    }): Promise<unknown>;
    resetPasswordSendOtp(payload: {
        email: string;
    }): Promise<unknown>;
    resetPasswordVerifyOtp(payload: {
        email: string;
        password: string;
        code: string;
    }): Promise<unknown>;
    convertUserByEmailSendOtp(payload: {
        email: string;
    }): Promise<unknown>;
    convertUserByEmailVerifyOtp(payload: {
        email: string;
        password: string;
        code: string;
    }): Promise<AuthTokenResponse>;
}

interface PushPayload {
    type: "PUSH";
    pushId?: string;
    appId?: string;
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
    priority?: "LOW" | "NORMAL" | "HIGH";
    ttlSeconds?: number;
    expiresAt?: number;
    timestamp?: number;
    image?: string;
}
type PushSdkErrorListener = (error: Error) => void;
declare class PushSdk {
    private static readonly reconnectBaseDelayMs;
    private static readonly reconnectMaxDelayMs;
    private static readonly maxReconnectAttempts;
    private static readonly authTimeoutMs;
    private static readonly reconnectableCloseCodes;
    private readonly core;
    private socket;
    private authenticatedSocket;
    private reconnectTimer;
    private authTimer;
    private reconnectAttempts;
    private reconnectEnabled;
    private networkListenersAttached;
    private isOffline;
    private connectionGeneration;
    private readonly authSentSockets;
    private readonly errorListeners;
    private readonly tabId;
    private readonly coordinationChannelName;
    private coordinationChannel;
    private coordinationStarted;
    private isLeader;
    private leaderId;
    private leaderLastSeenAt;
    private readonly candidateIds;
    private electionTimer;
    private heartbeatTimer;
    private leaderWatchdogTimer;
    private readonly handleOffline;
    private readonly handleOnline;
    private static createTabId;
    private static hashScope;
    constructor(core: CoreSdk);
    onError(listener: PushSdkErrorListener): () => void;
    requestPermission(): Promise<NotificationPermission>;
    start(): Promise<NotificationPermission>;
    private ensureInstallationToken;
    connect(): void;
    private connectSocket;
    private startCoordination;
    private handleCoordinationMessage;
    private acceptLeader;
    private scheduleElection;
    private electLeader;
    private becomeLeader;
    private becomeFollower;
    private postCoordinationMessage;
    private stopHeartbeat;
    private clearElectionTimer;
    private stopSocket;
    private stopCoordination;
    disconnect(): void;
    private scheduleReconnect;
    private clearReconnectTimer;
    private notifyError;
    private startAuthTimeout;
    private clearAuthTimer;
    private attachNetworkListeners;
    private handleMessage;
    private showPushNotification;
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

export { AnalyticsSdk, AuthSdk, BrowserStorage, CoreSdk, FetchHttpClient, HttpError, OAuthError, PushSdk };
export type { AnalyticsCollectResponse, AnalyticsIdentityAction, AnalyticsIdentityResponse, AnalyticsParamValue, AnalyticsParams, AnalyticsSdkConfig, AuthTokenResponse, CoreSdkConfig, DeviceData, DeviceRegisterResponse, PushPayload, PushSdkErrorListener, RequestOptions };
