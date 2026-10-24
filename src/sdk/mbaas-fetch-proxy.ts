'use client';

const SDK_HTTP_PORTS = new Set(['7078', '8060', '8075']);
const ORIGINAL_FETCH_KEY = Symbol.for('mbaas.original-fetch');

type WindowWithOriginalFetch = Window & typeof globalThis & {
	[ORIGINAL_FETCH_KEY]?: typeof window.fetch;
};

const getRequestUrl = (input: RequestInfo | URL) => {
	if (input instanceof Request) return input.url;
	return input.toString();
};

const getProxyUrl = (requestUrl: string) => {
	let url: URL;
	try {
		url = new URL(requestUrl);
	} catch {
		return null;
	}

	if (!['http:', 'https:'].includes(url.protocol) || !SDK_HTTP_PORTS.has(url.port)) return null;
	return `${window.location.origin}/api/sdk/${url.port}${url.pathname}${url.search}`;
};

export const installMbaasFetchProxy = () => {
	if (typeof window === 'undefined' || process.env.NEXT_PUBLIC_USE_SDK_PROXY !== 'true') return;

	const proxyWindow = window as WindowWithOriginalFetch;
	if (proxyWindow[ORIGINAL_FETCH_KEY]) return;

	const originalFetch = window.fetch.bind(window);
	proxyWindow[ORIGINAL_FETCH_KEY] = originalFetch;

	window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
		const proxyUrl = getProxyUrl(getRequestUrl(input));
		if (!proxyUrl) return originalFetch(input, init);

		if (input instanceof Request) {
			return originalFetch(new Request(proxyUrl, input), init);
		}

		return originalFetch(proxyUrl, init);
	};
};
