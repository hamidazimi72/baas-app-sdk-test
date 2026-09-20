import { useState, useCallback, useRef, useMemo } from 'react';

// ─── Types ────────────────────────────────────

type Updater<T> = Partial<T> | ((prev: T) => Partial<T>);

interface UseObjectStateReturn<T extends object> {
	initialValues: T;
	values: T;
	set: (updater: Updater<T>) => void;
	setField: <K extends keyof T>(key: K, value: T[K]) => void;
	reset: () => void;
	resetField: <K extends keyof T>(key: K) => void;
	dispatch: React.Dispatch<React.SetStateAction<T>>;
	isDirty: boolean;
	dirtyFields: (keyof T)[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useObjectState<T extends object>(initialValues: T): UseObjectStateReturn<T> {
	const initialRef = useRef<T>(initialValues);
	const [values, dispatch] = useState<T>(initialValues);

	const set = useCallback((updater: Updater<T>) => {
		dispatch((prev) => ({
			...prev,
			...(typeof updater === 'function' ? updater(prev) : updater),
		}));
	}, []);

	const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
		dispatch((prev) => ({ ...prev, [key]: value }));
	}, []);

	const reset = useCallback(() => {
		dispatch(initialRef.current);
	}, []);

	const resetField = useCallback(<K extends keyof T>(key: K) => {
		dispatch((prev) => ({ ...prev, [key]: initialRef.current[key] }));
	}, []);

	const isDirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(initialRef.current), [values]);

	const dirtyFields = useMemo<(keyof T)[]>(
		() => (Object.keys(values) as (keyof T)[]).filter((key) => values[key] !== initialRef.current[key]),
		[values],
	);

	return {
		initialValues: initialRef.current,
		values,
		set,
		setField,
		reset,
		resetField,
		dispatch,
		isDirty,
		dirtyFields,
	};
}

export { useObjectState };
