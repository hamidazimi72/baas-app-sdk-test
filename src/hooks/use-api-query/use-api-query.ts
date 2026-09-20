import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

import type { adapters } from '@/services';

// Reads — thin `useQuery` wrapper over an endpoint/descriptor with project defaults.
// `useApiQuery(API.X.list, params, options?)`   ← bound endpoint (the common case)
// `useApiQuery(API.X.list.query(params), options?)`  ← descriptor (for a dynamically-chosen endpoint)
// `options.failToast: false` opts out of the global QueryCache.onError toast (forwarded via `meta`).

export type ApiQueryOptions<TData> = Omit<UseQueryOptions<TData, Error, TData>, 'queryKey' | 'queryFn'> & {
	failToast?: boolean;
};

export function useApiQuery<TParams, TData>(
	endpoint: adapters.QueryEndpoint<TParams, TData>,
	params: TParams,
	options?: ApiQueryOptions<TData>,
): UseQueryResult<TData, Error>;
export function useApiQuery<TData>(
	descriptor: adapters.QueryDescriptor<TData>,
	options?: ApiQueryOptions<TData>,
): UseQueryResult<TData, Error>;
export function useApiQuery(
	source: adapters.QueryEndpoint<unknown, unknown> | adapters.QueryDescriptor<unknown>,
	paramsOrOptions?: unknown,
	maybeOptions?: ApiQueryOptions<unknown>,
): UseQueryResult<unknown, Error> {
	const isEndpoint = 'query' in source && typeof source.query === 'function';
	const descriptor = isEndpoint
		? (source as adapters.QueryEndpoint<unknown, unknown>).query(paramsOrOptions)
		: (source as adapters.QueryDescriptor<unknown>);
	const { failToast, meta, ...rest } =
		((isEndpoint ? maybeOptions : paramsOrOptions) as ApiQueryOptions<unknown>) ?? {};

	return useQuery<unknown, Error, unknown>({
		queryKey: descriptor.queryKey,
		queryFn: descriptor.queryFn,
		...rest,
		meta: { ...meta, failToast },
	});
}
