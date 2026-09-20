/**
 * Minimal in-memory rate limiter (single-instance deployments).
 *
 * Tracks attempts per key in a fixed window. No external store — counters live in module
 * memory, so this is per-process; behind a load balancer use a shared store instead.
 * Used by the login route to slow down credential brute-forcing.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: boolean; retryAfter: number };

/**
 * @param key       Identifier to limit on (e.g. client IP).
 * @param limit     Max attempts allowed within the window.
 * @param windowMs  Window length in milliseconds.
 */
export const checkRateLimit = (key: string, limit: number, windowMs: number): RateLimitResult => {
	const now = Date.now();
	const bucket = buckets.get(key);

	if (!bucket || bucket.resetAt <= now) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return { ok: true, retryAfter: 0 };
	}

	bucket.count += 1;
	if (bucket.count > limit) {
		return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
	}

	return { ok: true, retryAfter: 0 };
};

/** Best-effort client IP from proxy headers (falls back to a shared bucket). */
export const clientIp = (request: Request): string => {
	const forwarded = request.headers.get('x-forwarded-for');
	if (forwarded) return forwarded.split(',')[0]!.trim();
	return request.headers.get('x-real-ip')?.trim() || 'unknown';
};
