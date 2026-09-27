import type { DeviceInfoData } from "./DeviceInfo.js";

const INSTALLATION_TOKEN_DB_NAME = "mbaas-sdk";
const INSTALLATION_TOKEN_DB_VERSION = 2;
const INSTALLATION_TOKEN_STORE_NAME = "installation-tokens";

function openInstallationTokenDatabase(): Promise<IDBDatabase> {
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

async function setInstallationTokenInIndexedDb(key: string, token: string): Promise<void> {
  return openInstallationTokenDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
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
      }),
  );
}

async function clearInstallationTokenFromIndexedDb(key: string): Promise<void> {
  return openInstallationTokenDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
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
      }),
  );
}

export class BrowserStorage {
  private readonly prefix: string;

  constructor(prefix = "mbaas") {
    this.prefix = prefix;
  }

  private get installationTokenKey(): string {
    return `${this.prefix}:installation_token`;
  }

  private get installationTokenExpiresAtKey(): string {
    return `${this.prefix}:installation_token_expires_at`;
  }

  private get authTokenKey(): string {
    return `${this.prefix}:auth_token`;
  }

  private get deviceInfoKey(): string {
    return `${this.prefix}:device_info:v1`;
  }

  private get sessionStartKey(): string {
    return `${this.prefix}:session_start`;
  }

  async getInstallationToken(): Promise<string | null> {
    return window.localStorage.getItem(this.installationTokenKey);
  }

  async getInstallationTokenExpiresAt(): Promise<number | null> {
    const storedExpiresAt = window.localStorage.getItem(this.installationTokenExpiresAtKey);
    if (storedExpiresAt === null || storedExpiresAt.trim() === "") {
      return null;
    }

    const expiresAt = Number(storedExpiresAt);
    return Number.isFinite(expiresAt) ? expiresAt : null;
  }

  async setInstallationToken(token: string, expiresAt?: number): Promise<void> {
    window.localStorage.setItem(this.installationTokenKey, token);
    if (expiresAt !== undefined && Number.isFinite(expiresAt)) {
      window.localStorage.setItem(this.installationTokenExpiresAtKey, String(expiresAt));
    } else {
      window.localStorage.removeItem(this.installationTokenExpiresAtKey);
    }
    await setInstallationTokenInIndexedDb(this.installationTokenKey, token);
  }

  async clearInstallationToken(): Promise<void> {
    window.localStorage.removeItem(this.installationTokenKey);
    window.localStorage.removeItem(this.installationTokenExpiresAtKey);
    await clearInstallationTokenFromIndexedDb(this.installationTokenKey);
  }

  async getAuthToken(): Promise<string | null> {
    return window.localStorage.getItem(this.authTokenKey);
  }

  async setAuthToken(token: string): Promise<void> {
    window.localStorage.setItem(this.authTokenKey, token);
  }

  async clearAuthToken(): Promise<void> {
    window.localStorage.removeItem(this.authTokenKey);
  }

  async getDeviceInfo(): Promise<DeviceInfoData | null> {
    const value = window.localStorage.getItem(this.deviceInfoKey);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as DeviceInfoData;
    } catch {
      return null;
    }
  }

  async setDeviceInfo(deviceInfo: DeviceInfoData): Promise<void> {
    window.localStorage.setItem(this.deviceInfoKey, JSON.stringify(deviceInfo));
  }

  async getSessionStart(): Promise<string | null> {
    return window.sessionStorage.getItem(this.sessionStartKey);
  }

  async setSessionStart(value = new Date().toISOString()): Promise<void> {
    window.sessionStorage.setItem(this.sessionStartKey, value);
  }
}
