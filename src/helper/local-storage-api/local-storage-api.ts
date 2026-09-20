type StorageMethod = 'simple' | 'json';

/** Thin, SSR-safe wrapper around `window.localStorage` that never throws. */
export class LocalStorageAPI {
	static setItem(key: string, value: unknown, method: StorageMethod = 'simple'): void {
		if (!key || typeof window === 'undefined') return;

		try {
			localStorage.setItem(key, method === 'json' ? JSON.stringify(value) : String(value));
		} catch {
			// Storage unavailable (private mode / quota exceeded) — ignore.
		}
	}

	static getItem<T = string>(key: string, method: StorageMethod = 'simple'): T | null {
		if (!key || typeof window === 'undefined') return null;

		try {
			const raw = localStorage.getItem(key);
			if (raw === null) return null;

			return method === 'json' ? (JSON.parse(raw) as T) : (raw as T);
		} catch {
			return null;
		}
	}

	static removeItem(key: string): void {
		if (!key || typeof window === 'undefined') return;

		try {
			localStorage.removeItem(key);
		} catch {
			// ignore
		}
	}
}
