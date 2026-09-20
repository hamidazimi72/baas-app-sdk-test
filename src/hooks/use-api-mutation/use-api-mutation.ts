import { useMutation } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';

import { adapters } from '@/services';

// Writes (the single write primitive) — bind a mutation endpoint, then call it with params + options:
//   const create = useApiMutation(API.X.create);
//   create.call(payload, { onOk, successToast: true, invalidate: [API.X.list.key()] });   // create.isLoading
// A plain `(params) => Promise<T>` is also accepted as an escape hatch for non-endpoint writes. The
// generic infers over a union (e.g. `isOn ? API.X.activate : API.X.deactivate`), so a toggle works too.
export type ApiMutationCallOptions<TData> = {
	onOk?: (data: TData) => void;
	onError?: (error: adapters.ApiError) => void;
	successToast?: boolean | string;
	failToast?: boolean;
	invalidate?: QueryKey[];
};

type AnyMutator = adapters.MutationEndpoint<any, any> | ((params: any) => Promise<any>);
type MutatorParams<M> =
	M extends adapters.MutationEndpoint<infer P, any> ? P : M extends (params: infer P) => Promise<any> ? P : never;
type MutatorData<M> =
	M extends adapters.MutationEndpoint<any, infer D> ? D : M extends (...args: never) => Promise<infer D> ? D : never;

export function useApiMutation<M extends AnyMutator>(mutator: M) {
	type TParams = MutatorParams<M>;
	type TData = MutatorData<M>;

	const run = (typeof mutator === 'function' ? mutator : mutator.request) as (params: TParams) => Promise<TData>;
	const mutation = useMutation<TData, adapters.ApiError, TParams>({ mutationFn: (params) => run(params) });

	const call = (params: TParams, options: ApiMutationCallOptions<TData> = {}) =>
		mutation.mutate(params, {
			onSuccess: (data) => {
				if (options.invalidate?.length) {
					const queryClient = adapters.getQueryClient();
					options.invalidate.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
				}
				if (options.successToast) {
					toast.success(typeof options.successToast === 'string' ? options.successToast : 'عملیات با موفقیت انجام شد');
				}
				options.onOk?.(data);
			},
			onError: (error) => {
				if (options.failToast !== false) toast.error(adapters.resolveErrorMessage(error));
				options.onError?.(error);
			},
		});

	return {
		call,
		mutate: mutation.mutate,
		isLoading: mutation.isPending,
		isPending: mutation.isPending,
		isSuccess: mutation.isSuccess,
		isError: mutation.isError,
		data: mutation.data,
		reset: mutation.reset,
	};
}
