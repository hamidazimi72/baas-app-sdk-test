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

export { PushSdk };
export type { PushPayload, PushSdkErrorListener };
