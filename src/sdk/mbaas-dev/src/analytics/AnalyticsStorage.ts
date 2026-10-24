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

export interface AnalyticsClientDiagnostics {
  dropped_expired?: number;
  dropped_future_clock?: number;
  dropped_queue_overflow?: number;
}

const DIAGNOSTICS_KEY = "client_diagnostics";
const COLLECTION_ENABLED_KEY = "collection_enabled";
const DIAGNOSTICS_FIELDS = ["dropped_expired", "dropped_future_clock", "dropped_queue_overflow"] as const;
const UTF8_ENCODER = new TextEncoder();

function getEventSizeBytes(event: QueuedAnalyticsEvent): number {
  return UTF8_ENCODER.encode(JSON.stringify(event)).byteLength;
}

function normalizeDiagnostics(value: unknown): Required<AnalyticsClientDiagnostics> {
  const counters = value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as AnalyticsClientDiagnostics
    : {};
  return Object.fromEntries(DIAGNOSTICS_FIELDS.map((field) => {
    const count = counters[field];
    return [field, typeof count === "number" && Number.isFinite(count) && count >= 0 ? count : 0];
  })) as Required<AnalyticsClientDiagnostics>;
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
    await this.pruneEvents(timestamp);
  }

  async pruneEvents(
    beforeTimestamp: number,
    now?: number,
    maxQueuedEvents?: number,
    maxQueueSizeBytes?: number,
  ): Promise<void> {
    const database = await this.open();
    return this.writeTransaction(database, [EVENTS_STORE, METADATA_STORE], (transaction) => {
      const eventsStore = transaction.objectStore(EVENTS_STORE);
      const metadataStore = transaction.objectStore(METADATA_STORE);
      const request = eventsStore.getAll();
      request.onsuccess = () => {
        const dropped = normalizeDiagnostics({});
        const retained: QueuedAnalyticsEvent[] = [];
        for (const event of request.result as QueuedAnalyticsEvent[]) {
          if (typeof event.eventTimestamp === "number" && event.eventTimestamp < beforeTimestamp) {
            eventsStore.delete(event.eventId);
            dropped.dropped_expired++;
          } else if (now !== undefined && typeof event.eventTimestamp === "number" && event.eventTimestamp > now) {
            eventsStore.delete(event.eventId);
            dropped.dropped_future_clock++;
          } else {
            retained.push(event);
          }
        }
        retained.sort((first, second) => first.eventTimestamp - second.eventTimestamp);
        let retainedSizeBytes = maxQueueSizeBytes === undefined
          ? 0
          : retained.reduce((total, event) => total + getEventSizeBytes(event), 0);
        let oldestIndex = 0;
        while (
          (maxQueuedEvents !== undefined && retained.length - oldestIndex > maxQueuedEvents) ||
          (maxQueueSizeBytes !== undefined && retainedSizeBytes > maxQueueSizeBytes)
        ) {
          const oldestEvent = retained[oldestIndex++];
          eventsStore.delete(oldestEvent.eventId);
          if (maxQueueSizeBytes !== undefined) {
            retainedSizeBytes -= getEventSizeBytes(oldestEvent);
          }
          dropped.dropped_queue_overflow++;
        }
        if (!DIAGNOSTICS_FIELDS.some((field) => dropped[field] > 0)) return;

        const metadataRequest = metadataStore.get(DIAGNOSTICS_KEY);
        metadataRequest.onsuccess = () => {
          const counters = normalizeDiagnostics(metadataRequest.result);
          DIAGNOSTICS_FIELDS.forEach((field) => { counters[field] += dropped[field]; });
          metadataStore.put(counters, DIAGNOSTICS_KEY);
        };
      };
    });
  }

  async getClientDiagnostics(): Promise<AnalyticsClientDiagnostics> {
    return normalizeDiagnostics(await this.getMetadata<unknown>(DIAGNOSTICS_KEY, {}));
  }

  async completeBatch(eventIds: string[], sentDiagnostics: AnalyticsClientDiagnostics): Promise<void> {
    const database = await this.open();
    return this.writeTransaction(database, [EVENTS_STORE, METADATA_STORE], (transaction) => {
      const eventsStore = transaction.objectStore(EVENTS_STORE);
      eventIds.forEach((eventId) => eventsStore.delete(eventId));
      const metadataStore = transaction.objectStore(METADATA_STORE);
      const request = metadataStore.get(DIAGNOSTICS_KEY);
      request.onsuccess = () => {
        const counters = normalizeDiagnostics(request.result);
        const sent = normalizeDiagnostics(sentDiagnostics);
        // Keep drops recorded while this batch was in flight for the next successful send.
        DIAGNOSTICS_FIELDS.forEach((field) => { counters[field] = Math.max(0, counters[field] - sent[field]); });
        metadataStore.put(counters, DIAGNOSTICS_KEY);
      };
    });
  }

  async clearForIdentityReset(): Promise<void> {
    const database = await this.open();
    return this.writeTransaction(database, [EVENTS_STORE, METADATA_STORE], (transaction) => {
      transaction.objectStore(EVENTS_STORE).clear();
      const metadataStore = transaction.objectStore(METADATA_STORE);
      metadataStore.delete(DIAGNOSTICS_KEY);
      metadataStore.delete("identity");
    });
  }

  async getAnalyticsCollectionEnabled(): Promise<boolean> {
    return (await this.getMetadata<unknown>(COLLECTION_ENABLED_KEY, true)) !== false;
  }

  async setAnalyticsCollectionEnabled(enabled: boolean): Promise<void> {
    return this.setMetadata(COLLECTION_ENABLED_KEY, enabled);
  }

  async disableAnalyticsCollection(): Promise<void> {
    const database = await this.open();
    return this.writeTransaction(database, [EVENTS_STORE, METADATA_STORE], (transaction) => {
      transaction.objectStore(EVENTS_STORE).clear();
      const metadataStore = transaction.objectStore(METADATA_STORE);
      metadataStore.delete(DIAGNOSTICS_KEY);
      metadataStore.put(false, COLLECTION_ENABLED_KEY);
    });
  }

  async clearStoredIdentity(): Promise<void> {
    const database = await this.open();
    return this.transaction(database, METADATA_STORE, "readwrite", (store) => store.delete("identity"));
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
    return this.writeTransaction(database, [storeName], (transaction) => {
      operation(transaction.objectStore(storeName));
    }, mode);
  }

  private writeTransaction(
    database: IDBDatabase,
    storeNames: string[],
    operation: (transaction: IDBTransaction) => void,
    mode: IDBTransactionMode = "readwrite",
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeNames, mode);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
      transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Analytics storage transaction aborted.")); };
      try {
        operation(transaction);
      } catch (error) {
        transaction.abort();
        reject(error);
      }
    });
  }
}
