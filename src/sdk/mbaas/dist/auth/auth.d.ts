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

export { AuthSdk, OAuthError };
export type { AuthTokenResponse };
