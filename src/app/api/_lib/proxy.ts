import { NextResponse } from 'next/server';

import { BACKEND_FETCH_TIMEOUT_MS } from './constants';
import { BACKEND_API_URL, clearSession, readSession } from './session';

const REQUEST_HEADERS = ['accept', 'accept-language', 'content-type'] as const;
const RESPONSE_HEADERS = [
	'allow',
	'cache-control',
	'content-disposition',
	'content-language',
	'content-type',
	'etag',
	'last-modified',
	'retry-after',
] as const;

export type ProxyResponseContext = {
	requestBody: ArrayBuffer | null;
	responseBody: ArrayBuffer;
	upstreamResponse: Response;
};

type ProxyResponseHandler = (context: ProxyResponseContext) => Promise<NextResponse | null>;

const forwardHeaders = (source: Headers, names: readonly string[]): Headers => {
	const headers = new Headers();
	for (const name of names) {
		const value = source.get(name);
		if (value) headers.set(name, value);
	}
	return headers;
};

export const upstreamResponse = (request: Request, response: Response, body: ArrayBuffer): NextResponse => {
	const hasNoBody = request.method === 'HEAD' || response.status === 204 || response.status === 304;
	return new NextResponse(hasNoBody ? null : body, {
		status: response.status,
		statusText: response.statusText,
		headers: forwardHeaders(response.headers, RESPONSE_HEADERS),
	});
};

/** Forwards one same-origin BFF request to the fixed backend host. */
export const proxyRequest = async (
	request: Request,
	path: string,
	handleResponse?: ProxyResponseHandler,
): Promise<NextResponse> => {
	const session = await readSession();
	const headers = forwardHeaders(request.headers, REQUEST_HEADERS);
	if (session?.token) headers.set('authorization', `Bearer ${session.token}`);

	const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
	const requestBody = hasBody ? await request.arrayBuffer() : null;
	const search = new URL(request.url).search;

	let response: Response;
	try {
		response = await fetch(`${BACKEND_API_URL}/${path}${search}`, {
			// response = await fetch(`http://130.185.72.14:8085/${path}${search}`, {
			method: request.method,
			headers,
			body: requestBody ? Buffer.from(requestBody) : undefined,
			redirect: 'manual',
			cache: 'no-store',
			signal: AbortSignal.timeout(BACKEND_FETCH_TIMEOUT_MS),
		});
	} catch (error) {
		const isTimeout = error instanceof DOMException && error.name === 'TimeoutError';
		return NextResponse.json(
			{ success: false, message: isTimeout ? 'پاسخ سرور بیش از حد طول کشید' : 'خطا در ارتباط با سرور' },
			{ status: isTimeout ? 504 : 502 },
		);
	}

	if (response.status === 401) await clearSession();

	const responseBody = await response.arrayBuffer();
	const handled = await handleResponse?.({ requestBody, responseBody, upstreamResponse: response });
	return handled ?? upstreamResponse(request, response, responseBody);
};
