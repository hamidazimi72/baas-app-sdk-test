/// <reference lib="webworker" />

// ---------------* Service Worker (native, dependency-free) *--------------- //
// Source of truth — compiled to `public/sw.js` via `npm run build:sw` (esbuild).
// Bundler-agnostic: works identically under Turbopack, webpack, and static export.
// Registered (production only) by `src/app/layout-provider.tsx`.

export {};

declare const self: ServiceWorkerGlobalScope;

// ---------------* Config *--------------- //

const VERSION = 'v2';
const PRECACHE = `precache-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const OFFLINE_URL = '/offline.html';

// Minimal, fetch-safe precache (public assets that always 200) — the rest is
// filled in at runtime. Keeping this list tiny avoids brittle install failures.
const PRECACHE_URLS = [OFFLINE_URL, '/manifest.json'];

// ---------------* Helpers *--------------- //

const isPublicAsset = (url: URL): boolean =>
	url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/');

const isPrivatePath = (url: URL): boolean =>
	url.pathname === '/api' ||
	url.pathname.startsWith('/api/') ||
	url.pathname === '/console' ||
	url.pathname.startsWith('/console/');

const isRscRequest = (request: Request, url: URL): boolean =>
	url.searchParams.has('_rsc') ||
	request.headers.get('rsc') === '1' ||
	request.headers.has('next-router-state-tree') ||
	request.headers.get('accept')?.includes('text/x-component') === true;

const isCacheable = (response: Response): boolean =>
	response.status === 200 &&
	(response.type === 'basic' || response.type === 'default') &&
	!response.headers.get('cache-control')?.match(/(?:no-store|private)/i);

const networkOnly = async (request: Request, offlineFallback = false): Promise<Response> => {
	try {
		return await fetch(request);
	} catch {
		if (offlineFallback) {
			const offline = await caches.match(OFFLINE_URL);
			if (offline) return offline;
		}

		return Response.error();
	}
};

const cacheFirst = async (request: Request): Promise<Response> => {
	const cached = await caches.match(request);
	if (cached) return cached;

	const cache = await caches.open(ASSETS);

	try {
		const response = await fetch(request);
		if (isCacheable(response)) cache.put(request, response.clone());
		return response;
	} catch {
		return Response.error();
	}
};

// ---------------* Lifecycle *--------------- //

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(PRECACHE)
			.then((cache) => cache.addAll(PRECACHE_URLS))
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== PRECACHE && key !== ASSETS).map((key) => caches.delete(key))),
			)
			.then(() => self.clients.claim()),
	);
});

self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
	if (event.data?.type === 'CLEAR_RUNTIME_CACHES') {
		event.waitUntil(
			caches
				.keys()
				.then((keys) => Promise.all(keys.filter((key) => key.startsWith('runtime-')).map((key) => caches.delete(key)))),
		);
	}
});

// ---------------* Fetch *--------------- //

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	// Auth/BFF data, console HTML, and RSC payloads are session-bound and must never
	// touch Cache API. Navigations are also network-only so middleware always runs.
	if (isPrivatePath(url) || isRscRequest(request, url)) {
		event.respondWith(networkOnly(request, request.mode === 'navigate'));
		return;
	}

	if (request.mode === 'navigate') {
		event.respondWith(networkOnly(request, true));
		return;
	}

	if (isPublicAsset(url)) {
		event.respondWith(cacheFirst(request));
		return;
	}

	event.respondWith(networkOnly(request));
});

// Push SDK service-worker handlers are kept in a separate file so this URL can
// later be replaced with the SDK CDN URL without changing the app service worker.
importScripts('/sdk-sw.js');
