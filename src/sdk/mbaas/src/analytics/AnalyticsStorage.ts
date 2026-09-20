export interface QueuedAnalyticsEvent {
  eventId: string;
  eventName: string;
  eventTimestamp: number;
  engagementTimeMsec?: number;
  eventParams?: Record<string, string | number | boolean>;
}

export interface AnalyticsIdentity {
  userId?: string;
  userProperties?: Record<string, string>;
}

const DB_NAME = "mbaas-analytics";
const DB_VERSION = 1;
const EVENTS_STORE = "events";
const METADATA_STORE = "metadata";

export class AnalyticsStorage {
  private open(): Promise<IDBDatabase> {
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

  async addEvent(event: QueuedAnalyticsEvent): Promise<void> {
    const database = await this.open();
    return this.transaction(database, EVENTS_STORE, "readwrite", (store) => store.put(event));
  }

  async getEvents(): Promise<QueuedAnalyticsEvent[]> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const request = database.transaction(EVENTS_STORE, "readonly").objectStore(EVENTS_STORE).getAll();
      request.onsuccess = () => {
        database.close();
        resolve((request.result as QueuedAnalyticsEvent[]).sort((a, b) => a.eventTimestamp - b.eventTimestamp));
      };
      request.onerror = () => { database.close(); reject(request.error); };
    });
  }

  async deleteEvents(eventIds: string[]): Promise<void> {
    if (!eventIds.length) return;
    const database = await this.open();
    return this.transaction(database, EVENTS_STORE, "readwrite", (store) => {
      eventIds.forEach((eventId) => store.delete(eventId));
    });
  }

  async deleteEventsBefore(timestamp: number): Promise<void> {
    const events = await this.getEvents();
    await this.deleteEvents(events.filter((event) => event.eventTimestamp < timestamp).map((event) => event.eventId));
  }

  async getIdentity(): Promise<AnalyticsIdentity> {
    return this.getMetadata<AnalyticsIdentity>("identity", {});
  }

  async setIdentity(identity: AnalyticsIdentity): Promise<void> {
    return this.setMetadata("identity", identity);
  }

  private async getMetadata<T>(key: string, fallback: T): Promise<T> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const request = database.transaction(METADATA_STORE, "readonly").objectStore(METADATA_STORE).get(key);
      request.onsuccess = () => { database.close(); resolve((request.result as T | undefined) ?? fallback); };
      request.onerror = () => { database.close(); reject(request.error); };
    });
  }

  private async setMetadata(key: string, value: unknown): Promise<void> {
    const database = await this.open();
    return this.transaction(database, METADATA_STORE, "readwrite", (store) => store.put(value, key));
  }

  private transaction(
    database: IDBDatabase,
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      operation(transaction.objectStore(storeName));
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
    });
  }
}
