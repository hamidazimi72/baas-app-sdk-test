'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { AnalyticsSdk, AuthSdk, CoreSdk, PushSdk } from 'new-sdk';

import { installSdkFetchProxy } from './sdk-fetch-proxy';

type MbaasSdkContextValue = {
	core: CoreSdk | null;
	auth: AuthSdk | null;
	push: PushSdk | null;
	analytics: AnalyticsSdk | null;
	isConfigured: boolean;
	isInitialized: boolean;
	isPushInitialized: boolean;
	isAnalyticsInitialized: boolean;
	initializationError: Error | null;
	pushInitializationError: Error | null;
};

const MbaasSdkContext = createContext<MbaasSdkContextValue | null>(null);

const getWebSocketUrl = (baseUrl: string) => {
	if (!baseUrl) return undefined;

	try {
		const url = new URL(baseUrl);
		url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
		return url.toString().replace(/\/$/, '');
	} catch {
		return undefined;
	}
};

const getCoreConfig = () => {
	const baseUrl = process.env.NEXT_PUBLIC_MBAAS_BASE_URL?.trim() ?? '';
	const webSocketUrl = 'wss://merci-booking.com';
	// const webSocketUrl = process.env.NEXT_PUBLIC_MBAAS_WEBSOCKET_URL?.trim() ?? '';

	return {
		baseUrl,
		apiKey: process.env.NEXT_PUBLIC_MBAAS_API_KEY ?? '',
		webSocketUrl: webSocketUrl || getWebSocketUrl(baseUrl),
	};
};

export function MbaasProvider({ children }: Readonly<{ children: React.ReactNode }>) {
	installSdkFetchProxy();
	const config = useMemo(() => getCoreConfig(), []);
	const [isInitialized, setIsInitialized] = useState(false);
	const [initializationError, setInitializationError] = useState<Error | null>(null);
	const [isPushInitialized, setIsPushInitialized] = useState(false);
	const [analytics, setAnalytics] = useState<AnalyticsSdk | null>(null);
	const [isAnalyticsInitialized, setIsAnalyticsInitialized] = useState(false);
	const [pushInitializationError, setPushInitializationError] = useState<Error | null>(null);

	const core = useMemo(() => {
		if (!config.baseUrl || !config.apiKey) return null;
		return new CoreSdk(config);
	}, [config]);

	const auth = useMemo(() => (core ? new AuthSdk(core) : null), [core]);
	const push = useMemo(() => (core ? new PushSdk(core) : null), [core]);

	useEffect(() => {
		if (!core || !isInitialized || typeof window === 'undefined') return;

		const analyticsSdk = new AnalyticsSdk(core, { appVersion: '3.2.1' });
		setAnalytics(analyticsSdk);
		setIsAnalyticsInitialized(true);

		return () => {
			analyticsSdk.destroy();
			setAnalytics(null);
			setIsAnalyticsInitialized(false);
		};
	}, [core, isInitialized]);

	useEffect(() => {
		if (!core) return;

		let active = true;
		void core
			.initializeApp()
			.then(() => {
				if (active) setIsInitialized(true);
			})
			.catch((error: unknown) => {
				if (!active) return;
				setInitializationError(error instanceof Error ? error : new Error(String(error)));
			});

		return () => {
			active = false;
		};
	}, [core]);

	useEffect(() => {
		if (!core || !push || !isInitialized || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

		let active = true;
		const initializePush = async () => {
			try {
				const registration = await navigator.serviceWorker.register('/sw.js');
				if (!registration) return;
				await push.start();
				if (active) setIsPushInitialized(true);
			} catch (error: unknown) {
				if (!active) return;
				setPushInitializationError(error instanceof Error ? error : new Error(String(error)));
			}
		};

		if (document.readyState === 'complete') void initializePush();
		else window.addEventListener('load', initializePush, { once: true });

		return () => {
			active = false;
			window.removeEventListener('load', initializePush);
			push.disconnect();
		};
	}, [core, isInitialized, push]);

	const value = useMemo<MbaasSdkContextValue>(
		() => ({
			core,
			auth,
			push,
			analytics,
			isConfigured: Boolean(core && auth),
			isInitialized,
			isPushInitialized,
			isAnalyticsInitialized,
			initializationError,
			pushInitializationError,
		}),
		[
			analytics,
			auth,
			core,
			initializationError,
			isAnalyticsInitialized,
			isInitialized,
			isPushInitialized,
			push,
			pushInitializationError,
		],
	);

	return <MbaasSdkContext.Provider value={value}>{children}</MbaasSdkContext.Provider>;
}

export function useMbaasSdk(): MbaasSdkContextValue {
	const context = useContext(MbaasSdkContext);
	if (!context) throw new Error('useMbaasSdk must be used inside MbaasProvider.');
	return context;
}

export function useMbaasCore(): CoreSdk {
	const { core } = useMbaasSdk();
	if (!core) throw new Error('Mbaas CoreSdk is not configured. Check .env.local.');
	return core;
}

export function useMbaasAuth(): AuthSdk {
	const { auth } = useMbaasSdk();
	if (!auth) throw new Error('Mbaas AuthSdk is not configured. Check .env.local.');
	return auth;
}

export function useMbaasPush(): PushSdk {
	const { push } = useMbaasSdk();
	if (!push) throw new Error('Mbaas PushSdk is not configured. Check .env.local.');
	return push;
}

export function useMbaasAnalytics(): AnalyticsSdk {
	const { analytics } = useMbaasSdk();
	if (!analytics) throw new Error('Mbaas AnalyticsSdk is not initialized yet.');
	return analytics;
}
