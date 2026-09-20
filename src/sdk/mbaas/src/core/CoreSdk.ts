import { FetchHttpClient, RequestOptions } from "./FetchHttpClient.js";
import { BrowserStorage } from "./BrowserStorage.js";
import { DeviceInfo, DeviceInfoData } from "./DeviceInfo.js";

export interface CoreSdkConfig {
  baseUrl: string;
  apiKey: string;
  /**
   * Push WebSocket host. The SDK appends :7071/ws/push.
   * Example: wss://api.example.com
   */
  webSocketUrl?: string;
}

export interface DeviceData {
  token: string;
  status: string;
}

export interface DeviceRegisterResponse {
  success: boolean;
  data?: DeviceData;
  [key: string]: unknown;
}

export class CoreSdk {
  private static readonly defaultWebSocketPort = "7071";
  private static readonly webSocketPath = "/ws/push";
  readonly SDK_VERSION = "1.0.0";
  readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly webSocketUrl: string | undefined;
  private readonly httpClient: FetchHttpClient;
  private readonly storage: BrowserStorage;
  private readonly deviceInfo: DeviceInfo;
  private initializationPromise: Promise<void> | null = null;

  constructor(config: CoreSdkConfig) {
    if (!config) {
      throw new Error("CoreSdk config is required.");
    }
    if (!config.baseUrl) {
      throw new Error("CoreSdk baseUrl is required.");
    }
    if (!config.apiKey) {
      throw new Error("CoreSdk Api-key is required.");
    }

    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.webSocketUrl = config.webSocketUrl?.trim();
    this.httpClient = new FetchHttpClient();
    this.storage = new BrowserStorage();
    this.deviceInfo = new DeviceInfo();
  }

  private getApiKeyHeader() {
    return { "X-Api-Key": this.apiKey };
  }

  private areDeviceInfoEqual(first: DeviceInfoData, second: DeviceInfoData): boolean {
    return (
      first.browser === second.browser &&
      first.browserVersion === second.browserVersion &&
      first.device === second.device &&
      first.deviceTimezone === second.deviceTimezone &&
      first.deviceLanguage === second.deviceLanguage
    );
  }

  async deviceRegister(payload?: {
    region?: string;
    gender?: string;
    age?: number;
    browser?: string;
    browserVersion?: string;
    device?: "Mobile" | "Desktop";
    deviceTimezone?: string | null;
    deviceLanguage?: string | null;
  }): Promise<DeviceRegisterResponse> {
    const response = await this.httpClient.request<DeviceRegisterResponse>({
      method: "POST",
      url: `${this.baseUrl}:7078/api/v1/devices/register`,
      headers: { "Content-Type": "application/json", ...this.getApiKeyHeader() },
      body: {
        platform: "WEB",
        ...this.deviceInfo.getDeviceInfo(),
        ...(payload ?? {}),
      },
    });

    if (response.success && response.data) {
      await this.storage.setInstallationToken(response.data.token);
    }

    return response;
  }

  async deviceUpdate(payload?: {
    userId?: string;
    region?: string;
    gender?: string;
    age?: number;
    browser?: string;
    browserVersion?: string;
    device?: "Mobile" | "Desktop";
    deviceTimezone?: string | null;
    deviceLanguage?: string | null;
  }): Promise<Record<string, any>> {
    const installationToken = await this.ensureInstallationToken();

    const currentDeviceInfo = this.deviceInfo.getDeviceInfo();
    const savedDeviceInfo = await this.storage.getDeviceInfo();
    const shouldUpdateDeviceInfo = !savedDeviceInfo || !this.areDeviceInfoEqual(savedDeviceInfo, currentDeviceInfo);

    const response = await this.httpClient.request<Record<string, any>>({
      method: "PATCH",
      url: `${this.baseUrl}:7078/api/v1/devices/update`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${installationToken}`,
      },
      body: {
        ...(shouldUpdateDeviceInfo ? currentDeviceInfo : {}),
        ...(payload ?? {}),
        lastVisitAt: new Date().getTime(),
      },
    });

    if (response.success && shouldUpdateDeviceInfo) {
      await this.storage.setDeviceInfo(currentDeviceInfo);
    }

    return response;
  }

  getWebSocketUrl(): string {
    if (!this.webSocketUrl) {
      throw new Error("CoreSdk webSocketUrl is required to use PushSdk.");
    }

    const parsedUrl = this.assertWebSocketUrl(this.webSocketUrl);

    parsedUrl.port = CoreSdk.defaultWebSocketPort;
    parsedUrl.pathname = CoreSdk.webSocketPath;
    parsedUrl.search = "";
    parsedUrl.hash = "";

    return parsedUrl.toString().replace(/\/$/, "");
  }

  private assertWebSocketUrl(webSocketUrl: string): URL {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(webSocketUrl);
    } catch {
      throw new Error("CoreSdk webSocketUrl must be a valid absolute URL.");
    }

    if (parsedUrl.protocol !== "ws:" && parsedUrl.protocol !== "wss:") {
      throw new Error("CoreSdk webSocketUrl must use ws or wss protocol.");
    }

    return parsedUrl;
  }

  async ensureInstallationToken(): Promise<string> {
    let installationToken = await this.getInstallationToken();

    if (!installationToken) {
      await this.initializeApp();
      installationToken = await this.getInstallationToken();
    }

    if (!installationToken) {
      throw new Error("Installation token is unavailable.");
    }

    return installationToken;
  }

  async initializeApp(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeAppInternal().finally(() => {
      this.initializationPromise = null;
    });

    return this.initializationPromise;
  }

  private async initializeAppInternal(): Promise<void> {
    if (!(await this.storage.getSessionStart())) {
      await this.storage.setSessionStart();
    }

    const currentDeviceInfo = this.deviceInfo.getDeviceInfo();
    const installationToken = await this.storage.getInstallationToken();

    if (!installationToken) {
      const response = await this.deviceRegister(currentDeviceInfo);

      if (response.success) {
        await this.storage.setDeviceInfo(currentDeviceInfo);
      }

      return;
    }

    const savedDeviceInfo = await this.storage.getDeviceInfo();

    if (!savedDeviceInfo || !this.areDeviceInfoEqual(savedDeviceInfo, currentDeviceInfo)) {
      await this.deviceUpdate();
    }
  }

  async getInstallationToken(): Promise<string | null> {
    return this.storage.getInstallationToken();
  }

  async clearInstallationToken(): Promise<void> {
    return this.storage.clearInstallationToken();
  }

  async getAuthToken(): Promise<string | null> {
    return this.storage.getAuthToken();
  }

  async setAuthToken(token: string): Promise<void> {
    return this.storage.setAuthToken(token);
  }

  async clearAuthToken(): Promise<void> {
    return this.storage.clearAuthToken();
  }

  async request<T = unknown>(options: RequestOptions): Promise<T> {
    if (!options?.method || !options?.url) {
      throw new Error("Request method and url are required.");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    };

    return this.httpClient.request<T>({
      method: options.method,
      url: `${this.baseUrl}${options.url}`,
      headers,
      body: options.body,
    });
  }
}
