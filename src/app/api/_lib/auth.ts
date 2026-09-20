import { NextResponse } from 'next/server';

import { createSessionProfile, normalizeSessionExpiry } from './auth-profile';
import { checkRateLimit, clientIp } from './rate-limit';
import { proxyRequest, type ProxyResponseContext } from './proxy';
import { clearSession, readSession, writeSession } from './session';

export const AUTH_PATH = {
	captcha: 'api/v1/admin/auth/captcha',
	login: 'api/v1/admin/auth/login',
	verifyOtp: 'api/v1/admin/auth/verify-otp',
	logout: 'api/v1/admin/auth/logout',
	me: 'session/me',
	changePassword: 'api/v1/admin/auth/change-password',
} as const;

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 60_000;

type JsonRecord = Record<string, unknown>;

const parseRecord = (body: ArrayBuffer | null): JsonRecord => {
	if (!body) return {};
	try {
		const value: unknown = JSON.parse(new TextDecoder().decode(body));
		return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
	} catch {
		return {};
	}
};

const createSession = async ({
	requestBody,
	responseBody,
	upstreamResponse,
}: ProxyResponseContext): Promise<NextResponse | null> => {
	if (!upstreamResponse.ok) return null;

	const payload = parseRecord(responseBody);
	if (payload.success === false) return null;

	const data = payload.data;
	if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

	const dto = data as JsonRecord;
	if (dto.otpRequired === true && typeof dto.otpId === 'string' && dto.otpId) {
		return NextResponse.json(payload, { status: upstreamResponse.status });
	}
	const token = dto.token;
	if (typeof token !== 'string' || !token) {
		return NextResponse.json({ success: false, message: 'توکن از سرور دریافت نشد' }, { status: 502 });
	}

	const profile = createSessionProfile(dto, parseRecord(requestBody), false);
	const expiresAt = normalizeSessionExpiry(dto.expiresAt);
	await writeSession({ token, expiresAt, profile });

	return NextResponse.json({ ...payload, data: profile }, { status: upstreamResponse.status });
};

export const handleLogin = async (request: Request, path: string): Promise<NextResponse> => {
	const rate = checkRateLimit(`login:${clientIp(request)}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
	if (!rate.ok) {
		return NextResponse.json(
			{ success: false, message: 'تعداد تلاش‌ها بیش از حد مجاز است. لطفاً بعداً تلاش کنید.' },
			{ status: 429, headers: { 'Retry-After': String(rate.retryAfter) } },
		);
	}
	return proxyRequest(request, path, createSession);
};

export const handleVerifyOtp = async (request: Request, path: string): Promise<NextResponse> =>
	proxyRequest(request, path, createSession);

export const handleLogout = async (request: Request, path: string): Promise<NextResponse> => {
	try {
		const session = await readSession();
		if (session?.token) await proxyRequest(request, path);
	} finally {
		await clearSession();
	}

	// Logout is best-effort upstream: the local session is gone regardless of the backend response.
	return NextResponse.json({ success: true, data: { loggedOut: true } });
};

export const handleSessionProfile = async (request: Request): Promise<NextResponse> => {
	if (request.method !== 'GET') {
		return NextResponse.json(
			{ success: false, message: 'روش درخواست پشتیبانی نمی‌شود.' },
			{ status: 405, headers: { Allow: 'GET' } },
		);
	}
	const session = await readSession();
	if (!session) await clearSession();
	return NextResponse.json({ success: true, data: session?.profile ?? null });
};
