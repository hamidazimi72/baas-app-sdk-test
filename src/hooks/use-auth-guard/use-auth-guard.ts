import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ──────────────────────────────────────────────────────────────────

type AuthGuardMode = 'protected' | 'guest';

interface UseAuthGuardOptions<T> {
	userLoginInfo: T | null | undefined;
	mode: AuthGuardMode;
	redirectTo?: string;
}

interface UseAuthGuardReturn {
	isChecking: boolean;
	isAuthenticated: boolean;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_REDIRECT: Record<AuthGuardMode, string> = {
	protected: '/login',
	guest: '/',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useAuthGuard<T>({ userLoginInfo, mode, redirectTo }: UseAuthGuardOptions<T>): UseAuthGuardReturn {
	const router = useRouter();

	const [isRedirecting, setIsRedirecting] = useState(false);

	const isChecking = userLoginInfo === undefined;
	const isAuthenticated = !!userLoginInfo;

	const shouldRedirect = !isChecking && (mode === 'protected' ? !isAuthenticated : isAuthenticated);

	useEffect(() => {
		if (shouldRedirect) {
			const target = redirectTo ?? DEFAULT_REDIRECT[mode];
			setIsRedirecting(true);
			// Guard redirects use `replace` (not `push`) so Back doesn't return to a page the user
			// isn't allowed on (a guest page when authed, or a protected page when not).
			router.replace(target);
		} else {
			// Auth state reverted before unmount — drop the redirecting flag so the consumer's
			// PageLoader doesn't get stuck.
			setIsRedirecting(false);
		}
	}, [shouldRedirect, redirectTo, mode, router]);

	return { isChecking: isChecking || isRedirecting, isAuthenticated };
}

export { useAuthGuard };
export type { UseAuthGuardOptions, UseAuthGuardReturn, AuthGuardMode };
