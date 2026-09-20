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

export { BrowserStorage, CoreSdk, FetchHttpClient, HttpError };
export type { CoreSdkConfig, DeviceData, DeviceRegisterResponse, RequestOptions };
