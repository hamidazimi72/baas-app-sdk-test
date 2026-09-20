class HttpError extends Error {
    constructor(status, body, statusText = "") {
        super(`HTTP ${status}${statusText ? ` ${statusText}` : ""}`);
        this.name = "HttpError";
        this.status = status;
        this.body = body;
        Object.setPrototypeOf(this, HttpError.prototype);
    }
}
class FetchHttpClient {
    async request({ method, url, headers = {}, body }) {
        const response = await fetch(url, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const responseBody = await this.parseResponseBody(response);
        if (!response.ok) {
            throw new HttpError(response.status, responseBody, response.statusText);
        }
        return responseBody;
    }
    async parseResponseBody(response) {
        const contentType = response.headers.get("content-type") ?? "";
        const rawBody = await response.text();
        if (!rawBody) {
            return null;
        }
        if (contentType.includes("application/json")) {
            try {
                return JSON.parse(rawBody);
            }
            catch {
                return rawBody;
            }
        }
        return rawBody;
    }
}

const INSTALLATION_TOKEN_DB_NAME = "mbaas-sdk";
const INSTALLATION_TOKEN_DB_VERSION = 2;
const INSTALLATION_TOKEN_STORE_NAME = "installation-tokens";
function openInstallationTokenDatabase() {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(INSTALLATION_TOKEN_DB_NAME, INSTALLATION_TOKEN_DB_VERSION);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(INSTALLATION_TOKEN_STORE_NAME)) {
                request.result.createObjectStore(INSTALLATION_TOKEN_STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
async function setInstallationTokenInIndexedDb(key, token) {
    return openInstallationTokenDatabase().then((database) => new Promise((resolve, reject) => {
        const transaction = database.transaction(INSTALLATION_TOKEN_STORE_NAME, "readwrite");
        transaction.objectStore(INSTALLATION_TOKEN_STORE_NAME).put(token, key);
        transaction.oncomplete = () => {
            database.close();
            resolve();
        };
        transaction.onerror = () => {
            database.close();
            reject(transaction.error);
        };
    }));
}
async function clearInstallationTokenFromIndexedDb(key) {
    return openInstallationTokenDatabase().then((database) => new Promise((resolve, reject) => {
        const transaction = database.transaction(INSTALLATION_TOKEN_STORE_NAME, "readwrite");
        transaction.objectStore(INSTALLATION_TOKEN_STORE_NAME).delete(key);
        transaction.oncomplete = () => {
            database.close();
            resolve();
        };
        transaction.onerror = () => {
            database.close();
            reject(transaction.error);
        };
    }));
}
class BrowserStorage {
    constructor(prefix = "mbaas") {
        this.prefix = prefix;
    }
    get installationTokenKey() {
        return `${this.prefix}:installation_token`;
    }
    get authTokenKey() {
        return `${this.prefix}:auth_token`;
    }
    get deviceInfoKey() {
        return `${this.prefix}:device_info:v1`;
    }
    get sessionStartKey() {
        return `${this.prefix}:session_start`;
    }
    async getInstallationToken() {
        return window.localStorage.getItem(this.installationTokenKey);
    }
    async setInstallationToken(token) {
        window.localStorage.setItem(this.installationTokenKey, token);
        await setInstallationTokenInIndexedDb(this.installationTokenKey, token);
    }
    async clearInstallationToken() {
        window.localStorage.removeItem(this.installationTokenKey);
        await clearInstallationTokenFromIndexedDb(this.installationTokenKey);
    }
    async getAuthToken() {
        return window.localStorage.getItem(this.authTokenKey);
    }
    async setAuthToken(token) {
        window.localStorage.setItem(this.authTokenKey, token);
    }
    async clearAuthToken() {
        window.localStorage.removeItem(this.authTokenKey);
    }
    async getDeviceInfo() {
        const value = window.localStorage.getItem(this.deviceInfoKey);
        if (!value) {
            return null;
        }
        try {
            return JSON.parse(value);
        }
        catch {
            return null;
        }
    }
    async setDeviceInfo(deviceInfo) {
        window.localStorage.setItem(this.deviceInfoKey, JSON.stringify(deviceInfo));
    }
    async getSessionStart() {
        return window.sessionStorage.getItem(this.sessionStartKey);
    }
    async setSessionStart(value = new Date().toISOString()) {
        window.sessionStorage.setItem(this.sessionStartKey, value);
    }
}

class DeviceInfo {
    getDeviceInfo() {
        const browserInfo = this.getBrowserInfo();
        return {
            browser: browserInfo.browserName,
            browserVersion: browserInfo.browserVersion,
            device: this.getDeviceType(),
            deviceTimezone: this.getDeviceTimezone(),
            deviceLanguage: this.getDeviceLanguage(),
        };
    }
    getDeviceLanguage() {
        const deviceLanguage = navigator.language ||
            navigator.userLanguage ||
            null;
        return deviceLanguage;
    }
    getDeviceTimezone() {
        const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
        return deviceTimezone;
    }
    getDeviceType() {
        const mobileUserAgentRegex = /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        return mobileUserAgentRegex.test(navigator.userAgent) ? "Mobile" : "Desktop";
    }
    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        const browsers = [
            { name: "Microsoft Edge", regex: /Edg\/([\d.]+)/ },
            { name: "Opera", regex: /(?:Opera|OPR)\/([\d.]+)/ },
            { name: "Firefox", regex: /Firefox\/([\d.]+)/ },
            {
                name: "Chrome",
                regex: /Chrome\/([\d.]+)/,
                exclude: [/Edg\//, /OPR\//],
            },
            {
                name: "Safari",
                regex: /Version\/([\d.]+)/,
                condition: /Safari\//,
            },
        ];
        for (const browser of browsers) {
            const match = userAgent.match(browser.regex);
            const excluded = browser.exclude?.some((ex) => ex.test(userAgent)) ?? false;
            const conditionPassed = browser.condition?.test(userAgent) ?? true;
            if (match && !excluded && conditionPassed) {
                return {
                    browserName: browser.name,
                    browserVersion: match[1] ?? "Unknown Version",
                };
            }
        }
        return {
            browserName: "Unknown Browser",
            browserVersion: "Unknown Version",
        };
    }
}

class CoreSdk {
    constructor(config) {
        this.SDK_VERSION = "1.0.0";
        this.initializationPromise = null;
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
    getApiKeyHeader() {
        return { "X-Api-Key": this.apiKey };
    }
    areDeviceInfoEqual(first, second) {
        return (first.browser === second.browser &&
            first.browserVersion === second.browserVersion &&
            first.device === second.device &&
            first.deviceTimezone === second.deviceTimezone &&
            first.deviceLanguage === second.deviceLanguage);
    }
    async deviceRegister(payload) {
        const response = await this.httpClient.request({
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
    async deviceUpdate(payload) {
        const installationToken = await this.ensureInstallationToken();
        const currentDeviceInfo = this.deviceInfo.getDeviceInfo();
        const savedDeviceInfo = await this.storage.getDeviceInfo();
        const shouldUpdateDeviceInfo = !savedDeviceInfo || !this.areDeviceInfoEqual(savedDeviceInfo, currentDeviceInfo);
        const response = await this.httpClient.request({
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
    getWebSocketUrl() {
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
    assertWebSocketUrl(webSocketUrl) {
        let parsedUrl;
        try {
            parsedUrl = new URL(webSocketUrl);
        }
        catch {
            throw new Error("CoreSdk webSocketUrl must be a valid absolute URL.");
        }
        if (parsedUrl.protocol !== "ws:" && parsedUrl.protocol !== "wss:") {
            throw new Error("CoreSdk webSocketUrl must use ws or wss protocol.");
        }
        return parsedUrl;
    }
    async ensureInstallationToken() {
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
    async initializeApp() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        this.initializationPromise = this.initializeAppInternal().finally(() => {
            this.initializationPromise = null;
        });
        return this.initializationPromise;
    }
    async initializeAppInternal() {
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
    async getInstallationToken() {
        return this.storage.getInstallationToken();
    }
    async clearInstallationToken() {
        return this.storage.clearInstallationToken();
    }
    async getAuthToken() {
        return this.storage.getAuthToken();
    }
    async setAuthToken(token) {
        return this.storage.setAuthToken(token);
    }
    async clearAuthToken() {
        return this.storage.clearAuthToken();
    }
    async request(options) {
        if (!options?.method || !options?.url) {
            throw new Error("Request method and url are required.");
        }
        const headers = {
            "Content-Type": "application/json",
            ...(options.headers ?? {}),
        };
        return this.httpClient.request({
            method: options.method,
            url: `${this.baseUrl}${options.url}`,
            headers,
            body: options.body,
        });
    }
}
CoreSdk.defaultWebSocketPort = "7071";
CoreSdk.webSocketPath = "/ws/push";

export { BrowserStorage, CoreSdk, FetchHttpClient, HttpError };
