'use client';

export interface SWRegisterOptions {
	/** Enable console logging. @default false */
	log?: boolean;
	/** Fired when registration succeeds. */
	onSuccess?: (registration: ServiceWorkerRegistration) => void;
	/** Fired when registration fails. */
	onError?: (error: Error) => void;
	/** Fired when an update for the active worker is found. */
	onUpdate?: (registration: ServiceWorkerRegistration) => void;
}

export class ServiceWorker {
	private static registered = false;

	/** Whether the Service Worker API is available in the current environment. */
	static isSupported(): boolean {
		return typeof window !== 'undefined' && 'serviceWorker' in navigator;
	}

	/** Register the service worker, wiring success / error / update callbacks. */
	static async register(
		path: string = '/sw.js',
		options: RegistrationOptions = { scope: '/' },
		controller: SWRegisterOptions = {},
	): Promise<ServiceWorkerRegistration | null | undefined> {
		if (!this.isSupported()) {
			if (controller.log) console.warn('[SW] Not supported');
			return null;
		}

		// Prevent double registration.
		if (this.registered) {
			if (controller.log) console.log('[SW] Already registered');
			return navigator.serviceWorker.getRegistration(options.scope);
		}

		try {
			const registration = await navigator.serviceWorker.register(path, options);
			this.registered = true;

			if (controller.log) {
				console.log('[SW] Registered');
				console.log('[SW] Scope:', registration.scope);
			}

			controller.onSuccess?.(registration);

			registration.addEventListener('updatefound', () => {
				const worker = registration.installing;
				if (!worker) return;

				worker.addEventListener('statechange', () => {
					if (worker.state === 'installed' && navigator.serviceWorker.controller) {
						if (controller.log) console.log('[SW] Update available');
						controller.onUpdate?.(registration);
					}
				});
			});

			return registration;
		} catch (err) {
			const error = err instanceof Error ? err : new Error(String(err));
			console.error('[SW] Registration failed:', error.message);

			controller.onError?.(error);
			return null;
		}
	}

	/** Unregister every service worker controlling this origin. */
	static async unregisterAll(): Promise<boolean> {
		if (!this.isSupported()) return false;

		try {
			const registrations = await navigator.serviceWorker.getRegistrations();
			await Promise.all(registrations.map((registration) => registration.unregister()));

			this.registered = false;
			console.log('[SW] Unregistered all');

			return true;
		} catch (error) {
			console.error('[SW] Unregister failed:', error);
			return false;
		}
	}

	/** Get the current registration for an optional scope. */
	static async get(scope?: string): Promise<ServiceWorkerRegistration | undefined> {
		if (!this.isSupported()) return;
		return navigator.serviceWorker.getRegistration(scope);
	}

	/** Force an update check on the active registration. */
	static async checkForUpdates(scope?: string): Promise<ServiceWorkerRegistration | null> {
		if (!this.isSupported()) return null;

		try {
			const registration = await this.get(scope);
			if (!registration) return null;

			await registration.update();
			console.log('[SW] Update check complete');

			return registration;
		} catch (error) {
			console.error('[SW] Update check failed:', error);
			return null;
		}
	}

	/** Ask the waiting worker to activate immediately (pairs with the `SKIP_WAITING` handler in `sw.ts`). */
	static async skipWaiting(): Promise<void> {
		if (!this.isSupported()) return;

		const registration = await navigator.serviceWorker.ready;
		registration.waiting?.postMessage({ type: 'SKIP_WAITING' });

		console.log('[SW] Skip waiting triggered');
	}
}
