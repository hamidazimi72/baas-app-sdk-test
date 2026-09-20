import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import { cookies } from 'next/headers';

import { SESSION_COOKIE } from './constants';

/**
 * Server-side session helpers for the BFF (Backend-For-Frontend) layer.
 *
 * The browser never sees the backend JWT: the BFF stores `{ token, expiresAt?, profile }`
 * as JSON inside an httpOnly cookie. `profile` is the flat login DTO **minus** the token
 * (userId/username/tenantId/roleId/accesses/…) and is the only part ever returned to the client
 * (via `/api/bff/session/me`). Keep the JSON well under the ~4KB cookie limit.
 *
 * Defence in depth: the cookie value is sealed with AES-256-GCM (`SESSION_SECRET`) so the
 * token/profile are not stored as readable plaintext (the cookie is already httpOnly+secure).
 */

/** Backend host only (e.g. `http://localhost:7074`). Server-only — never exposed to the client. */
export const BACKEND_API_URL = (process.env.BACKEND_API_URL ?? '').replace(/\/+$/, '');

//-----* Cookie sealing (AES-256-GCM, no external dependency) *-----//

const SESSION_SECRET = process.env.SESSION_SECRET;
// const SESSION_SECRET = 'change-me-to-a-long-random-string';
if (!SESSION_SECRET) throw new Error('SESSION_SECRET is required to seal server sessions.');

// Key derived from SESSION_SECRET (any length) → fixed 32 bytes via SHA-256.
const SESSION_KEY = createHash('sha256').update(SESSION_SECRET).digest();

/** Encrypt JSON → `base64(iv | authTag | ciphertext)`. */
const seal = (plaintext: string): string => {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', SESSION_KEY, iv);
	const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, ciphertext]).toString('base64url');
};

/** Reverse of `seal`; returns `null` on any tamper/format/key mismatch (e.g. legacy plaintext). */
const unseal = (sealed: string): string | null => {
	try {
		const buf = Buffer.from(sealed, 'base64url');
		const iv = buf.subarray(0, 12);
		const tag = buf.subarray(12, 28);
		const ciphertext = buf.subarray(28);
		const decipher = createDecipheriv('aes-256-gcm', SESSION_KEY, iv);
		decipher.setAuthTag(tag);
		return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
	} catch {
		return null;
	}
};

export type SessionProfile = Record<string, unknown>;

export type Session = {
	token: string;
	expiresAt?: number;
	profile: SessionProfile;
};

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export const readSession = async (): Promise<Session | null> => {
	const raw = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!raw) return null;

	// Unseal first; a legacy/plaintext or tampered value fails here and is treated as no session.
	const json = unseal(raw);
	if (!json) return null;

	try {
		const parsed = JSON.parse(json) as Session;
		if (!parsed?.token) return null;
		if (!parsed.profile || typeof parsed.profile !== 'object' || Array.isArray(parsed.profile)) return null;
		// Defence in depth: the cookie maxAge already expires it, but reject a stale value too.
		if (parsed.expiresAt && parsed.expiresAt <= Date.now()) return null;
		return parsed;
	} catch {
		return null;
	}
};

export const writeSession = async (session: Session): Promise<void> => {
	const ttlMs = session.expiresAt ? session.expiresAt - Date.now() : DEFAULT_TTL_MS;
	const maxAge = Math.max(0, Math.floor(ttlMs / 1000));

	(await cookies()).set(SESSION_COOKIE, seal(JSON.stringify(session)), {
		httpOnly: true,
		secure: false,
		sameSite: 'lax',
		path: '/',
		maxAge,
	});
};

export const clearSession = async (): Promise<void> => {
	(await cookies()).delete(SESSION_COOKIE);
};
