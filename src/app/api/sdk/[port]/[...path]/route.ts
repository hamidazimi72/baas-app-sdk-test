import type { NextRequest } from 'next/server';

const ALLOWED_PORTS = new Set(['7078', '8060', '8075']);
const REQUEST_HEADERS = ['accept', 'content-type', 'authorization', 'x-api-key'] as const;
const RESPONSE_HEADERS = [
	'cache-control',
	'content-disposition',
	'content-language',
	'content-type',
	'etag',
	'location',
] as const;

const getBackendUrl = () =>
	(process.env.MBAAS_BACKEND_URL ?? process.env.NEXT_PUBLIC_MBAAS_BASE_URL ?? '').replace(/\/+$/, '');

const copyHeaders = (source: Headers, names: readonly string[]) => {
	const headers = new Headers();
	for (const name of names) {
		const value = source.get(name);
		if (value) headers.set(name, value);
	}
	return headers;
};

const route = async (request: NextRequest, context: { params: Promise<{ port: string; path: string[] }> }) => {
	const { port, path } = await context.params;
	if (!ALLOWED_PORTS.has(port))
		return Response.json({ success: false, message: 'Unsupported SDK service.' }, { status: 404 });

	const backendUrl = getBackendUrl();
	if (!backendUrl)
		return Response.json({ success: false, message: 'BACKEND_API_URL is not configured.' }, { status: 500 });

	const target = `${backendUrl}:${port}/${path.map((part) => encodeURIComponent(part)).join('/')}${new URL(request.url).search}`;
	const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
	let response: Response;
	try {
		response = await fetch(target, {
			method: request.method,
			headers: copyHeaders(request.headers, REQUEST_HEADERS),
			body: hasBody ? await request.arrayBuffer() : undefined,
			redirect: 'manual',
			cache: 'no-store',
			signal: AbortSignal.timeout(15_000),
		});
	} catch (error) {
		const timeout = error instanceof DOMException && error.name === 'TimeoutError';
		return Response.json(
			{ success: false, message: timeout ? 'SDK service timed out.' : 'SDK service is unreachable.' },
			{ status: timeout ? 504 : 502 },
		);
	}

	const body =
		request.method === 'HEAD' || response.status === 204 || response.status === 304
			? null
			: await response.arrayBuffer();
	return new Response(body, {
		status: response.status,
		statusText: response.statusText,
		headers: copyHeaders(response.headers, RESPONSE_HEADERS),
	});
};

export { route as DELETE, route as GET, route as HEAD, route as OPTIONS, route as PATCH, route as POST, route as PUT };
