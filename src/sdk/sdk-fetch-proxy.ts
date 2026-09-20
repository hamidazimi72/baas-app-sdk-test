const SDK_SERVICE_PORTS = new Set(['7078', '8060', '8075']);

let installed = false;

/**
 * Keeps the SDK package transport-agnostic while routing its browser requests
 * through this app's same-origin BFF route.
 */
export const installSdkFetchProxy = (): void => {
	if (installed || typeof window === 'undefined') return;

	const configuredBaseUrl = process.env.NEXT_PUBLIC_MBAAS_BASE_URL?.trim();
	if (!configuredBaseUrl) return;

	let backend: URL;
	try {
		backend = new URL(configuredBaseUrl);
	} catch {
		return;
	}

	const originalFetch = window.fetch.bind(window);
	window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const inputUrl = input instanceof Request ? input.url : String(input);
		let requestUrl: URL;

		try {
			requestUrl = new URL(inputUrl, window.location.origin);
		} catch {
			return originalFetch(input, init);
		}

		if (requestUrl.hostname !== backend.hostname || !SDK_SERVICE_PORTS.has(requestUrl.port)) {
			return originalFetch(input, init);
		}

		const proxiedUrl = new URL(`/api/sdk/${requestUrl.port}${requestUrl.pathname}`, window.location.origin);
		proxiedUrl.search = requestUrl.search;

		if (input instanceof Request) {
			return originalFetch(new Request(proxiedUrl, input), init);
		}

		return originalFetch(proxiedUrl, init);
	};
	installed = true;
};
