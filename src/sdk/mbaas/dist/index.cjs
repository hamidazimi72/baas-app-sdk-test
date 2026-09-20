"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/sdk/mbaas/src/index.ts
var index_exports = {};
__export(index_exports, {
  AnalyticsSdk: () => AnalyticsSdk,
  AuthSdk: () => AuthSdk,
  BrowserStorage: () => BrowserStorage,
  CoreSdk: () => CoreSdk,
  FetchHttpClient: () => FetchHttpClient,
  HttpError: () => HttpError,
  OAuthError: () => OAuthError,
  PushSdk: () => PushSdk
});
module.exports = __toCommonJS(index_exports);

// src/sdk/mbaas/src/core/FetchHttpClient.ts
var HttpError = class _HttpError extends Error {
  constructor(status, body, statusText = "") {
    super(`HTTP ${status}${statusText ? ` ${statusText}` : ""}`);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
    Object.setPrototypeOf(this, _HttpError.prototype);
  }
};
var FetchHttpClient = class {
  async request({ method, url, headers = {}, body }) {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== void 0 ? JSON.stringify(body) : void 0
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
      } catch {
        return rawBody;
      }
    }
    return rawBody;
  }
};

// src/sdk/mbaas/src/core/BrowserStorage.ts
var INSTALLATION_TOKEN_DB_NAME = "mbaas-sdk";
var INSTALLATION_TOKEN_DB_VERSION = 2;
var INSTALLATION_TOKEN_STORE_NAME = "installation-tokens";
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
  return openInstallationTokenDatabase().then(
    (database) => new Promise((resolve, reject) => {
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
    })
  );
}
async function clearInstallationTokenFromIndexedDb(key) {
  return openInstallationTokenDatabase().then(
    (database) => new Promise((resolve, reject) => {
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
    })
  );
}
var BrowserStorage = class {
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
    } catch {
      return null;
    }
  }
  async setDeviceInfo(deviceInfo) {
    window.localStorage.setItem(this.deviceInfoKey, JSON.stringify(deviceInfo));
  }
  async getSessionStart() {
    return window.sessionStorage.getItem(this.sessionStartKey);
  }
  async setSessionStart(value = (/* @__PURE__ */ new Date()).toISOString()) {
    window.sessionStorage.setItem(this.sessionStartKey, value);
  }
};

// src/sdk/mbaas/src/core/DeviceInfo.ts
var DeviceInfo = class {
  getDeviceInfo() {
    const browserInfo = this.getBrowserInfo();
    return {
      browser: browserInfo.browserName,
      browserVersion: browserInfo.browserVersion,
      device: this.getDeviceType(),
      deviceTimezone: this.getDeviceTimezone(),
      deviceLanguage: this.getDeviceLanguage()
    };
  }
  getDeviceLanguage() {
    const deviceLanguage = navigator.language || navigator.userLanguage || null;
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
        exclude: [/Edg\//, /OPR\//]
      },
      {
        name: "Safari",
        regex: /Version\/([\d.]+)/,
        condition: /Safari\//
      }
    ];
    for (const browser of browsers) {
      const match = userAgent.match(browser.regex);
      const excluded = browser.exclude?.some((ex) => ex.test(userAgent)) ?? false;
      const conditionPassed = browser.condition?.test(userAgent) ?? true;
      if (match && !excluded && conditionPassed) {
        return {
          browserName: browser.name,
          browserVersion: match[1] ?? "Unknown Version"
        };
      }
    }
    return {
      browserName: "Unknown Browser",
      browserVersion: "Unknown Version"
    };
  }
};

// src/sdk/mbaas/src/core/CoreSdk.ts
var _CoreSdk = class _CoreSdk {
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
    this.proxyPath = config.proxyPath?.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.webSocketUrl = config.webSocketUrl?.trim();
    this.httpClient = new FetchHttpClient();
    this.storage = new BrowserStorage();
    this.deviceInfo = new DeviceInfo();
  }
  getApiKeyHeader() {
    return { "X-Api-Key": this.apiKey };
  }
  getServiceUrl(port, path) {
    if (this.proxyPath) {
      return `${this.proxyPath}/${port}${path}`;
    }
    return `${this.baseUrl}:${port}${path}`;
  }
  areDeviceInfoEqual(first, second) {
    return first.browser === second.browser && first.browserVersion === second.browserVersion && first.device === second.device && first.deviceTimezone === second.deviceTimezone && first.deviceLanguage === second.deviceLanguage;
  }
  async deviceRegister(payload) {
    const response = await this.httpClient.request({
      method: "POST",
      url: this.getServiceUrl("7078", "/api/v1/devices/register"),
      headers: { "Content-Type": "application/json", ...this.getApiKeyHeader() },
      body: {
        platform: "WEB",
        ...this.deviceInfo.getDeviceInfo(),
        ...payload ?? {}
      }
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
      url: this.getServiceUrl("7078", "/api/v1/devices/update"),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${installationToken}`
      },
      body: {
        ...shouldUpdateDeviceInfo ? currentDeviceInfo : {},
        ...payload ?? {},
        lastVisitAt: (/* @__PURE__ */ new Date()).getTime()
      }
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
    parsedUrl.port = _CoreSdk.defaultWebSocketPort;
    parsedUrl.pathname = _CoreSdk.webSocketPath;
    parsedUrl.search = "";
    parsedUrl.hash = "";
    return parsedUrl.toString().replace(/\/$/, "");
  }
  assertWebSocketUrl(webSocketUrl) {
    let parsedUrl;
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
    if (!await this.storage.getSessionStart()) {
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
      ...options.headers ?? {}
    };
    const serviceMatch = options.url.match(/^:(\d+)(\/.*)$/);
    const url = serviceMatch ? this.getServiceUrl(serviceMatch[1], serviceMatch[2]) : `${this.baseUrl}${options.url}`;
    return this.httpClient.request({
      method: options.method,
      url,
      headers,
      body: options.body
    });
  }
};
_CoreSdk.defaultWebSocketPort = "7071";
_CoreSdk.webSocketPath = "/ws/push";
var CoreSdk = _CoreSdk;

// src/sdk/mbaas/src/authentication/AuthSdk.ts
var OAuthError = class _OAuthError extends Error {
  constructor(code, description, uri) {
    super(description || code);
    this.name = "OAuthError";
    this.code = code;
    this.description = description;
    this.uri = uri;
    Object.setPrototypeOf(this, _OAuthError.prototype);
  }
};
var AuthSdk = class {
  constructor(core) {
    if (!core) {
      throw new Error("AuthSdk requires a CoreSdk instance.");
    }
    if (typeof core.request !== "function") {
      throw new Error("Invalid CoreSdk instance: missing request method.");
    }
    this.core = core;
  }
  async getAuthHeader() {
    const token = await this.core.getAuthToken();
    return { Authorization: token ? `Bearer ${token}` : "" };
  }
  async getInstallationTokenHeader() {
    return { Authorization: `Bearer ${await this.core.ensureInstallationToken()}` };
  }
  async saveTokenFromResponse(response) {
    if (response?.data?.token) {
      await this.core.setAuthToken(response.data.token);
    }
  }
  getOAuthCode(url, provider) {
    const state = url.searchParams.get("state");
    const storedState = sessionStorage.getItem(`${provider}_oauth_state`);
    if (!storedState || state !== storedState) {
      throw new OAuthError("invalid_state", "Invalid OAuth state.");
    }
    const error = url.searchParams.get("error");
    if (error) {
      throw new OAuthError(
        error,
        url.searchParams.get("error_description") ?? void 0,
        url.searchParams.get("error_uri") ?? void 0
      );
    }
    const code = url.searchParams.get("code");
    if (!code) {
      throw new OAuthError("authorization_code_missing", "Authorization code is missing.");
    }
    return code;
  }
  // OAuth with google
  signInWithGoogle(clientId, redirectUri) {
    const state = `google_${crypto.randomUUID()}`;
    sessionStorage.setItem(`google_oauth_state`, state);
    const params = new URLSearchParams({
      response_type: "code",
      scope: "openid email",
      client_id: clientId,
      redirect_uri: redirectUri,
      state
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    window.location.href = authUrl;
  }
  async handleGoogleCallback(clientId, clientSecret, redirectUri) {
    const url = new URL(window.location.href);
    const code = this.getOAuthCode(url, "google");
    const response = await this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/google",
      headers: await this.getInstallationTokenHeader(),
      body: {
        code,
        googleClientId: clientId,
        googleClientSecret: clientSecret,
        redirectUri
      }
    });
    if (response.success) {
      sessionStorage.removeItem(`google_oauth_state`);
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState(null, "", cleanUrl);
    }
    await this.saveTokenFromResponse(response);
    return response;
  }
  // OAuth with my gov
  signInWithMyGov(redirectUri) {
    const state = `myGov_${redirectUri.trim()}`;
    sessionStorage.setItem(`myGov_oauth_state`, state);
    const params = new URLSearchParams({
      response_type: "code",
      scope: "openid profile",
      client_id: "xmbaas.ir",
      redirect_uri: "https://xmbaas.ir/dolatman-callback",
      state
    });
    const authUrl = `https://sso.my.gov.ir/oauth2/authorize?${params.toString()}`;
    window.location.href = authUrl;
  }
  async handleMyGovCallback() {
    const url = new URL(window.location.href);
    const code = this.getOAuthCode(url, "myGov");
    const response = await this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/my-gov",
      headers: await this.getInstallationTokenHeader(),
      body: {
        code
      }
    });
    if (response.success) {
      sessionStorage.removeItem(`myGov_oauth_state`);
      const url2 = new URL(window.location.href);
      ["code", "state"].forEach((param) => {
        url2.searchParams.delete(param);
      });
      window.history.replaceState(null, "", url2.toString());
    }
    await this.saveTokenFromResponse(response);
    return response;
  }
  // Register with phone - Send Otp
  async registerPhoneSendOtp(payload) {
    return this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/phone/register/send-otp",
      headers: await this.getInstallationTokenHeader(),
      body: { ...payload }
    });
  }
  // Register with phone - Verify Otp
  async registerPhoneVerifyOtp(payload) {
    const response = await this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/phone/register/verify",
      headers: await this.getInstallationTokenHeader(),
      body: {
        // ...(await this.getDeviceIdBody()),d
        ...payload
      }
    });
    await this.saveTokenFromResponse(response);
    return response;
  }
  // Register with email - Send Otp
  async registerEmailSendOtp(payload) {
    return this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/email/register/send-otp",
      headers: await this.getInstallationTokenHeader(),
      body: { ...payload }
    });
  }
  // Register with email - Verify Otp
  async registerEmailVerifyOtp(payload) {
    const response = await this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/email/register/verify",
      headers: await this.getInstallationTokenHeader(),
      body: {
        // ...(await this.getDeviceIdBody()),
        ...payload
      }
    });
    await this.saveTokenFromResponse(response);
    return response;
  }
  // Login with phone - Send Otp
  async loginPhoneSendOtp(payload) {
    return this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/phone/login/send-otp",
      headers: await this.getInstallationTokenHeader(),
      body: { ...payload }
    });
  }
  // Login with phone - Verify Otp
  async loginPhoneVerifyOtp(payload) {
    const response = await this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/phone/login/verify",
      headers: await this.getInstallationTokenHeader(),
      body: {
        // ...(await this.getDeviceIdBody()),
        ...payload
      }
    });
    await this.saveTokenFromResponse(response);
    return response;
  }
  // Login with email - Send Otp
  async loginEmailSendOtp(payload) {
    return this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/email/login/send-otp",
      headers: await this.getInstallationTokenHeader(),
      body: { ...payload }
    });
  }
  // Login with email - Verify Otp
  async loginEmailVerifyOtp(payload) {
    const response = await this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/email/login/verify",
      headers: await this.getInstallationTokenHeader(),
      body: {
        // ...(await this.getDeviceIdBody()),
        ...payload
      }
    });
    await this.saveTokenFromResponse(response);
    return response;
  }
  // Login anonymous
  async loginAnonymous(payload) {
    const response = await this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/anonymous",
      headers: await this.getInstallationTokenHeader(),
      body: {
        // ...(await this.getDeviceIdBody()),
        ...payload
      }
    });
    await this.saveTokenFromResponse(response);
    return response;
  }
  // Login with My gov
  async loginMyGov(payload) {
    const response = await this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/my-gov",
      headers: await this.getInstallationTokenHeader(),
      body: {
        // ...(await this.getDeviceIdBody()),
        ...payload
      }
    });
    await this.saveTokenFromResponse(response);
    return response;
  }
  // Logout
  async logout() {
    const response = await this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/session/logout",
      headers: await this.getAuthHeader()
    });
    if (response?.success) {
      await this.core.clearAuthToken();
    }
    return response;
  }
  // Fetch all sessions
  async fetchAllSessions() {
    return this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/session/tokens",
      headers: await this.getAuthHeader()
    });
  }
  // Revoke token
  async revokeToken(payload) {
    return this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/session/tokens/revoke",
      headers: await this.getAuthHeader(),
      body: { tokenId: payload?.tokenId }
    });
  }
  // Fetch user profile
  async fetchUser() {
    return this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/profile/get",
      headers: await this.getAuthHeader()
    });
  }
  // Update user profile
  async updateUser(payload) {
    return this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/profile/update",
      headers: await this.getAuthHeader(),
      body: { ...payload }
    });
  }
  // Reset password - Send Otp
  async resetPasswordSendOtp(payload) {
    return this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/email/reset/password/sent-otp",
      headers: await this.getInstallationTokenHeader(),
      body: { ...payload }
    });
  }
  // Reset password - Verify Otp
  async resetPasswordVerifyOtp(payload) {
    return this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/email/reset/password/verify",
      headers: await this.getInstallationTokenHeader(),
      body: { ...payload }
    });
  }
  // Convert User By Email - Send Otp
  async convertUserByEmailSendOtp(payload) {
    return this.registerEmailSendOtp({ ...payload });
  }
  async convertUserByEmailVerifyOtp(payload) {
    const response = await this.core.request({
      method: "POST",
      url: ":8060/api/v1/auth/email/convert/user",
      body: {
        ...payload
      },
      headers: await this.getAuthHeader()
    });
    await this.saveTokenFromResponse(response);
    return response;
  }
};

// src/sdk/mbaas/src/push/PushSdk.ts
var _PushSdk = class _PushSdk {
  constructor(core) {
    this.socket = null;
    this.authenticatedSocket = null;
    this.reconnectTimer = null;
    this.authTimer = null;
    this.reconnectAttempts = 0;
    this.reconnectEnabled = false;
    this.networkListenersAttached = false;
    this.isOffline = false;
    this.connectionGeneration = 0;
    this.authSentSockets = /* @__PURE__ */ new WeakSet();
    this.errorListeners = /* @__PURE__ */ new Set();
    this.tabId = _PushSdk.createTabId();
    this.coordinationChannel = null;
    this.coordinationStarted = false;
    this.isLeader = false;
    this.leaderId = null;
    this.leaderLastSeenAt = 0;
    this.candidateIds = /* @__PURE__ */ new Set();
    this.electionTimer = null;
    this.heartbeatTimer = null;
    this.leaderWatchdogTimer = null;
    this.handleOffline = () => {
      this.isOffline = true;
      this.clearReconnectTimer();
      this.clearAuthTimer();
      const socket = this.socket;
      if (socket && socket.readyState !== WebSocket.CLOSED) {
        this.connectionGeneration += 1;
        this.socket = null;
        this.authenticatedSocket = null;
        socket.close();
      }
    };
    this.handleOnline = () => {
      this.isOffline = false;
      this.reconnectAttempts = 0;
      if (this.reconnectEnabled && !this.socket) {
        this.connect();
      }
    };
    if (!core) {
      throw new Error("PushSdk requires a CoreSdk instance.");
    }
    if (typeof core.request !== "function") {
      throw new Error("Invalid CoreSdk instance: missing request method.");
    }
    this.core = core;
    this.coordinationChannelName = `mbaas-push-coordination:${_PushSdk.hashScope(core.apiKey)}`;
  }
  static createTabId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  static hashScope(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }
  onError(listener) {
    if (typeof listener !== "function") {
      throw new Error("PushSdk onError listener must be a function.");
    }
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }
  async requestPermission() {
    if (typeof Notification === "undefined") {
      throw new Error("Notifications are not supported in this environment.");
    }
    const permission = Notification.permission;
    return permission === "default" ? Notification.requestPermission() : permission;
  }
  async start() {
    const permission = await this.requestPermission();
    if (permission === "granted") {
      await this.ensureInstallationToken();
      this.connect();
    }
    return permission;
  }
  async ensureInstallationToken() {
    let token = await this.core.getInstallationToken();
    if (!token) {
      await this.core.initializeApp();
      token = await this.core.getInstallationToken();
    }
    if (!token) {
      throw new Error("Unable to start PushSdk: installation token is missing.");
    }
  }
  connect() {
    if (typeof WebSocket === "undefined") {
      throw new Error("WebSocket is not supported in this environment.");
    }
    this.reconnectEnabled = true;
    this.attachNetworkListeners();
    this.clearReconnectTimer();
    if (this.isOffline || typeof navigator !== "undefined" && navigator.onLine === false) {
      this.isOffline = true;
      return;
    }
    this.startCoordination();
    if (!this.isLeader) {
      return;
    }
    this.connectSocket();
  }
  connectSocket() {
    if (!this.isLeader || !this.reconnectEnabled || this.isOffline) {
      return;
    }
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      return;
    }
    let socket;
    try {
      socket = new WebSocket(this.core.getWebSocketUrl());
    } catch (error) {
      this.notifyError(error);
      throw error;
    }
    const generation = ++this.connectionGeneration;
    this.socket = socket;
    this.authenticatedSocket = null;
    this.startAuthTimeout(socket, generation);
    socket.addEventListener("message", (event) => {
      void this.handleMessage(socket, generation, event.data).catch((error) => {
        this.notifyError(error);
      });
    });
    socket.addEventListener("error", () => {
      this.notifyError(new Error("WebSocket connection error."));
    });
    socket.addEventListener("close", (event) => {
      if (this.socket !== socket || generation !== this.connectionGeneration) {
        return;
      }
      this.clearAuthTimer();
      this.socket = null;
      this.authenticatedSocket = null;
      this.scheduleReconnect(event.code);
    });
  }
  startCoordination() {
    if (this.coordinationStarted) {
      return;
    }
    this.coordinationStarted = true;
    if (typeof BroadcastChannel === "undefined") {
      this.becomeLeader();
      return;
    }
    try {
      const channel = new BroadcastChannel(this.coordinationChannelName);
      this.coordinationChannel = channel;
      channel.addEventListener("message", (event) => {
        this.handleCoordinationMessage(event.data);
      });
      channel.addEventListener("messageerror", () => {
        this.notifyError(new Error("PushSdk BroadcastChannel message error."));
      });
      this.candidateIds.add(this.tabId);
      this.postCoordinationMessage({ type: "CANDIDATE", tabId: this.tabId });
      this.scheduleElection();
      this.leaderWatchdogTimer = setInterval(() => {
        if (this.isLeader || !this.reconnectEnabled) {
          return;
        }
        if (!this.leaderId || Date.now() - this.leaderLastSeenAt > 6e3) {
          this.leaderId = null;
          this.leaderLastSeenAt = 0;
          this.candidateIds.clear();
          this.candidateIds.add(this.tabId);
          this.scheduleElection(0);
        }
      }, 2e3);
    } catch (error) {
      this.notifyError(error);
      this.becomeLeader();
    }
  }
  handleCoordinationMessage(message) {
    if (!message || typeof message.type !== "string") {
      return;
    }
    if (message.type === "CANDIDATE" && message.tabId && message.tabId !== this.tabId) {
      if (this.isLeader) {
        this.postCoordinationMessage({ type: "LEADER", leaderId: this.tabId });
      } else if (!this.leaderId) {
        this.candidateIds.add(message.tabId);
      }
      return;
    }
    if ((message.type === "LEADER" || message.type === "HEARTBEAT") && message.leaderId) {
      this.acceptLeader(message.leaderId);
      if (message.type === "HEARTBEAT" && message.leaderId === this.leaderId) {
        this.leaderLastSeenAt = Date.now();
      }
      return;
    }
    if (message.type === "RELEASE" && message.leaderId && message.leaderId === this.leaderId) {
      this.leaderId = null;
      this.leaderLastSeenAt = 0;
      this.candidateIds.clear();
      this.candidateIds.add(this.tabId);
      this.scheduleElection(0);
    }
  }
  acceptLeader(leaderId) {
    if (leaderId === this.tabId) {
      this.becomeLeader();
      return;
    }
    if (this.isLeader) {
      if (leaderId < this.tabId) {
        this.becomeFollower(leaderId);
      } else {
        this.postCoordinationMessage({ type: "LEADER", leaderId: this.tabId });
      }
      return;
    }
    this.leaderId = leaderId;
    this.leaderLastSeenAt = Date.now();
    this.clearElectionTimer();
  }
  scheduleElection(delayMs = 100) {
    if (this.electionTimer || this.isLeader || !this.reconnectEnabled) {
      return;
    }
    this.electionTimer = setTimeout(() => {
      this.electionTimer = null;
      this.electLeader();
    }, delayMs);
  }
  electLeader() {
    if (!this.coordinationStarted || this.isLeader || !this.reconnectEnabled) {
      return;
    }
    if (this.leaderId && Date.now() - this.leaderLastSeenAt <= 6e3) {
      return;
    }
    this.candidateIds.add(this.tabId);
    const electedLeader = [...this.candidateIds].sort()[0];
    if (electedLeader === this.tabId) {
      this.becomeLeader();
      return;
    }
    this.leaderId = electedLeader;
    this.leaderLastSeenAt = Date.now();
  }
  becomeLeader() {
    this.clearElectionTimer();
    this.isLeader = true;
    this.leaderId = this.tabId;
    this.leaderLastSeenAt = Date.now();
    this.postCoordinationMessage({ type: "LEADER", leaderId: this.tabId });
    if (!this.heartbeatTimer && this.coordinationChannel) {
      this.heartbeatTimer = setInterval(() => {
        this.postCoordinationMessage({ type: "HEARTBEAT", leaderId: this.tabId });
      }, 2e3);
    }
    this.connectSocket();
  }
  becomeFollower(leaderId) {
    this.isLeader = false;
    this.leaderId = leaderId;
    this.leaderLastSeenAt = Date.now();
    this.clearElectionTimer();
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.stopSocket();
  }
  postCoordinationMessage(message) {
    try {
      this.coordinationChannel?.postMessage(message);
    } catch (error) {
      this.notifyError(error);
    }
  }
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  clearElectionTimer() {
    if (this.electionTimer) {
      clearTimeout(this.electionTimer);
      this.electionTimer = null;
    }
  }
  stopSocket() {
    this.clearAuthTimer();
    this.connectionGeneration += 1;
    const socket = this.socket;
    this.socket = null;
    this.authenticatedSocket = null;
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close();
    }
  }
  stopCoordination() {
    if (this.isLeader) {
      this.postCoordinationMessage({ type: "RELEASE", leaderId: this.tabId });
    }
    this.clearElectionTimer();
    this.stopHeartbeat();
    if (this.leaderWatchdogTimer) {
      clearInterval(this.leaderWatchdogTimer);
      this.leaderWatchdogTimer = null;
    }
    this.coordinationChannel?.close();
    this.coordinationChannel = null;
    this.coordinationStarted = false;
    this.isLeader = false;
    this.leaderId = null;
    this.leaderLastSeenAt = 0;
    this.candidateIds.clear();
  }
  disconnect() {
    this.reconnectEnabled = false;
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;
    this.stopCoordination();
    this.stopSocket();
  }
  scheduleReconnect(closeCode) {
    if (!this.reconnectEnabled || this.isOffline || !_PushSdk.reconnectableCloseCodes.has(closeCode) || this.reconnectTimer || this.reconnectAttempts >= _PushSdk.maxReconnectAttempts) {
      return;
    }
    this.reconnectAttempts += 1;
    const exponentialDelay = Math.min(
      _PushSdk.reconnectBaseDelayMs * 2 ** (this.reconnectAttempts - 1),
      _PushSdk.reconnectMaxDelayMs
    );
    const jitter = 0.8 + Math.random() * 0.4;
    const delay = Math.round(exponentialDelay * jitter);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.reconnectEnabled && !this.isOffline) {
        this.connect();
      }
    }, delay);
  }
  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  notifyError(error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    for (const listener of this.errorListeners) {
      try {
        listener(normalizedError);
      } catch {
      }
    }
  }
  startAuthTimeout(socket, generation) {
    this.clearAuthTimer();
    this.authTimer = setTimeout(() => {
      if (this.socket === socket && this.connectionGeneration === generation && this.authenticatedSocket !== socket) {
        this.notifyError(new Error("WebSocket AUTH timeout after 10 seconds."));
        socket.close(4008, "AUTH timeout");
      }
    }, _PushSdk.authTimeoutMs);
  }
  clearAuthTimer() {
    if (this.authTimer) {
      clearTimeout(this.authTimer);
      this.authTimer = null;
    }
  }
  attachNetworkListeners() {
    if (this.networkListenersAttached || typeof window === "undefined") {
      return;
    }
    window.addEventListener("offline", this.handleOffline);
    window.addEventListener("online", this.handleOnline);
    this.networkListenersAttached = true;
  }
  async handleMessage(socket, generation, rawMessage) {
    if (this.socket !== socket || this.connectionGeneration !== generation) {
      return;
    }
    let payload;
    try {
      payload = JSON.parse(rawMessage);
    } catch {
      this.notifyError(new Error("Received invalid JSON from WebSocket."));
      return;
    }
    if (payload.type === "HELLO") {
      if (this.authSentSockets.has(socket)) {
        return;
      }
      const token = await this.core.getInstallationToken();
      if (this.socket !== socket || this.connectionGeneration !== generation || !token || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      this.authSentSockets.add(socket);
      socket.send(
        JSON.stringify({
          type: "AUTH",
          token
        })
      );
      return;
    }
    if (payload.type === "CONNECTED") {
      this.clearAuthTimer();
      this.authenticatedSocket = socket;
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      return;
    }
    if (payload.type === "AUTH_ERROR") {
      const message = typeof payload.message === "string" ? payload.message : "WebSocket authentication failed.";
      this.notifyError(new Error(message));
      if (this.socket === socket) {
        this.authenticatedSocket = null;
        socket.close();
      }
      return;
    }
    if (payload.type === "PING" && this.authenticatedSocket === socket) {
      socket.send(JSON.stringify({ type: "PONG", timestamp: Date.now() }));
      return;
    }
    if (payload.type === "PUSH" && this.authenticatedSocket === socket) {
      await this.showPushNotification(payload);
    }
  }
  async showPushNotification(payload) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") {
      return;
    }
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      throw new Error("Service workers are not supported in this environment.");
    }
    const options = {
      ...payload,
      image: payload.image || void 0,
      data: {
        pushId: payload?.pushId
      }
    };
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(options.title || "", { ...options });
  }
};
_PushSdk.reconnectBaseDelayMs = 1e3;
_PushSdk.reconnectMaxDelayMs = 3e4;
_PushSdk.maxReconnectAttempts = 10;
_PushSdk.authTimeoutMs = 1e4;
_PushSdk.reconnectableCloseCodes = /* @__PURE__ */ new Set([1006, 4008]);
var PushSdk = _PushSdk;

// src/sdk/mbaas/src/analytics/AnalyticsStorage.ts
var DB_NAME = "mbaas-analytics";
var DB_VERSION = 1;
var EVENTS_STORE = "events";
var METADATA_STORE = "metadata";
var AnalyticsStorage = class {
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
      request.onerror = () => {
        database.close();
        reject(request.error);
      };
    });
  }
  async deleteEvents(eventIds) {
    if (!eventIds.length) return;
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
      request.onsuccess = () => {
        database.close();
        resolve(request.result ?? fallback);
      };
      request.onerror = () => {
        database.close();
        reject(request.error);
      };
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
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error);
      };
    });
  }
};

// src/sdk/mbaas/src/analytics/AnalyticsSdk.ts
var DEFAULTS = {
  // batchSize: 100,
  batchSize: 10,
  // flushIntervalMs: 60 * 60 * 1000,
  flushIntervalMs: 5 * 60 * 1e3,
  offlineRetentionMs: 72 * 60 * 60 * 1e3,
  sessionTimeoutMs: 30 * 60 * 1e3,
  maxEventNameLength: 40,
  maxEventIdLength: 128,
  maxEventParams: 25,
  maxUserProperties: 25,
  maxPropertyKeyLength: 24,
  maxPropertyValueLength: 36,
  maxParamValueLength: 100
};
var FIRST_VISIT_KEY = "mbaas:analytics:first_visit";
var SESSION_ID_KEY = "mbaas:analytics:session_id";
var SESSION_LAST_ACTIVE_KEY = "mbaas:analytics:session_last_active";
var SESSION_TIMEOUT_KEY = "mbaas:analytics:session_timeout_ms";
var AnalyticsSdk = class {
  constructor(core, config) {
    this.storage = new AnalyticsStorage();
    this.identity = {};
    this.flushTimer = null;
    this.flushPromise = null;
    this.automaticCollectionEnabled = true;
    this.automaticScreenTrackingEnabled = true;
    this.visibleSince = null;
    this.scrollReported = false;
    this.startedForms = /* @__PURE__ */ new WeakSet();
    this.videoProgress = /* @__PURE__ */ new WeakMap();
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
      if (this.scrollReported || !this.automaticScreenTrackingEnabled) return;
      const pageHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
      if (pageHeight > 0 && window.scrollY / pageHeight >= 0.9) {
        this.scrollReported = true;
        void this.enqueueAutomatic("scroll");
      }
    };
    this.handleClick = (event) => {
      if (!this.automaticCollectionEnabled) return;
      const target = event.target?.closest("a");
      if (!target || !(target instanceof HTMLAnchorElement)) return;
      const href = target.href;
      if (!href) return;
      const isDownload = /\.(pdf|zip|docx?|xlsx?|csv|txt|jpg|jpeg|png|gif)(?:$|[?#])/i.test(href);
      if (isDownload) {
        void this.enqueueAutomatic("file_download", { file_name: target.download || href.split("/").pop() || "" });
      } else if (new URL(href, window.location.href).hostname !== window.location.hostname) {
        void this.enqueueAutomatic("click", { link_url: href });
      }
    };
    this.handleFocusIn = (event) => {
      if (!this.automaticCollectionEnabled) return;
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
      const percent = Math.floor(event.target.currentTime / event.target.duration * 100 / 25) * 25;
      if (![25, 50, 75].includes(percent)) return;
      const progress = this.videoProgress.get(event.target) ?? /* @__PURE__ */ new Set();
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
    if (!userId) throw new Error("userId is required.");
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
    if (this.flushPromise) return this.flushPromise;
    this.flushPromise = this.flushInternal().finally(() => {
      this.flushPromise = null;
    });
    return this.flushPromise;
  }
  destroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
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
    if (!events.length) return;
    let token;
    try {
      token = await this.requireInstallationToken();
    } catch {
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
          body: await this.createBatch(batch)
        });
      } catch {
        return;
      }
      if (!response.success) return;
      this.saveSessionTimeout(response.data?.sessionTimeoutMs);
      await this.storage.deleteEvents(batch.map((event) => event.eventId));
    }
  }
  async createBatch(events) {
    const sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    return {
      ...this.identity.userId ? { user_id: this.identity.userId } : {},
      platform: "WEB",
      sdk_version: this.core.SDK_VERSION,
      app_version: this.appVersion,
      ...sessionId ? { session_id: sessionId } : {},
      ...this.identity.userProperties ? { user_properties: this.identity.userProperties } : {},
      events: events.map((event) => ({
        event_name: event.eventName,
        event_id: event.eventId,
        event_timestamp: event.eventTimestamp,
        ...event.engagementTimeMsec === void 0 ? {} : { engagement_time_msec: event.engagementTimeMsec },
        ...event.eventParams ? { event_params: event.eventParams } : {}
      }))
    };
  }
  async enqueueEvent(eventName, eventParams, engagementTimeMsec) {
    this.validateEventName(eventName);
    const event = {
      eventId: this.createEventId(),
      eventName,
      eventTimestamp: Date.now(),
      ...engagementTimeMsec === void 0 ? {} : { engagementTimeMsec },
      ...eventParams ? { eventParams: this.limitParams(eventParams) } : {}
    };
    await this.storage.deleteEventsBefore(Date.now() - DEFAULTS.offlineRetentionMs);
    await this.storage.addEvent(event);
    sessionStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(Date.now()));
    if ((await this.storage.getEvents()).length >= DEFAULTS.batchSize) void this.flush();
  }
  async identityRequest(body) {
    return this.core.request({
      method: "POST",
      url: ":8075/api/v1/analytics/identity",
      headers: { Authorization: `Bearer ${await this.requireInstallationToken()}` },
      body
    });
  }
  async requireInstallationToken() {
    let token = await this.core.getInstallationToken();
    if (!token) {
      await this.core.initializeApp();
      token = await this.core.getInstallationToken();
    }
    if (!token) throw new Error("AnalyticsSdk requires an installation token.");
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
    } else {
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
    if (!this.automaticCollectionEnabled || this.visibleSince === null) return;
    const duration = Date.now() - this.visibleSince;
    this.visibleSince = null;
    if (duration > 0) void this.enqueueAutomatic("user_engagement", void 0, duration);
  }
  async enqueueAutomatic(eventName, params, engagement) {
    if (!this.automaticCollectionEnabled) return;
    if ((eventName === "page_view" || eventName === "scroll") && !this.automaticScreenTrackingEnabled) return;
    await this.ready;
    if (eventName === "page_view") this.scrollReported = false;
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
    if (!new RegExp(`^[A-Za-z][A-Za-z0-9_]{0,${DEFAULTS.maxEventNameLength - 1}}$`).test(eventName) || /^(firebase_|google_|ga_)/.test(eventName)) {
      throw new Error("event_name is invalid.");
    }
  }
  limitParams(params) {
    return Object.fromEntries(
      Object.entries(params).slice(0, DEFAULTS.maxEventParams).map(([key, value]) => [
        key.slice(0, DEFAULTS.maxPropertyKeyLength),
        typeof value === "string" ? value.slice(0, DEFAULTS.maxParamValueLength) : value
      ])
    );
  }
  limitUserProperties(properties) {
    return Object.fromEntries(
      Object.entries(properties).slice(0, DEFAULTS.maxUserProperties).map(([key, value]) => [
        key.slice(0, DEFAULTS.maxPropertyKeyLength),
        value.slice(0, DEFAULTS.maxPropertyValueLength)
      ])
    );
  }
  createEventId() {
    return typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  getSessionTimeout() {
    const storedTimeout = Number(sessionStorage.getItem(SESSION_TIMEOUT_KEY));
    return Number.isFinite(storedTimeout) && storedTimeout > 0 ? storedTimeout : DEFAULTS.sessionTimeoutMs;
  }
  saveSessionTimeout(sessionTimeoutMs) {
    if (sessionTimeoutMs !== void 0 && Number.isFinite(sessionTimeoutMs) && sessionTimeoutMs > 0) {
      sessionStorage.setItem(SESSION_TIMEOUT_KEY, String(sessionTimeoutMs));
    }
  }
};
