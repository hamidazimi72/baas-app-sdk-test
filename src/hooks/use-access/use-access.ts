'use client';

import { useCallback, useMemo } from 'react';

import { universal_account } from '@/zustand';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AccessCode = string;

interface UseAccessReturn {
	/** `true` once the session bootstrap has resolved. */
	isResolved: boolean;
	/** Empty code means that the consumer is not permission-gated. */
	can: (code?: AccessCode) => boolean;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

function useAccess(): UseAccessReturn {
	const profile = universal_account.useStore((state) => state.userLoginInfo);
	const accesses = profile?.accesses;

	const granted = useMemo(() => new Set(accesses ?? []), [accesses]);

	const can = useCallback(
		(code?: AccessCode) => {
			if (!code) return true;

			// Fail closed until the cookie-backed session has been resolved.
			if (profile === undefined) return false;

			return granted.has(code);
		},
		[granted, profile],
	);

	return {
		// `undefined` means bootstrap is pending; `null` means a resolved anonymous session.
		isResolved: profile !== undefined,
		can,
	};
}

export { useAccess };
export type { UseAccessReturn };
