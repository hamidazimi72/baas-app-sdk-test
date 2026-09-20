import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// Thin App-Router navigation wrapper (router + pathname + searchParams). The old `insertQuery`/
// `removeQuery` query-drill helpers were removed when the projects drill moved to nested dynamic
// route segments (see `decisions.md` 2026-06-21) — navigation is now plain `router.push` to a path.
export const useRoutes = () => {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	return { ...router, pathname, searchParams };
};
