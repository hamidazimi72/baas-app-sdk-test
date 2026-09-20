/**
 * Auth constants shared between the BFF route handlers and the edge middleware.
 *
 * Kept free of `next/headers` (and any Node-only import) so `middleware.ts` can import
 * the cookie name without pulling server-only code into the edge runtime.
 */

/** httpOnly session cookie set by the BFF on login; never readable from client JS. */
export const SESSION_COOKIE = 'console_session';

/** Upstream timeout for BFF → backend fetches. Without it a hung backend ties up a server task. */
export const BACKEND_FETCH_TIMEOUT_MS = 15_000;
