'use client';

import { useEffect, useRef } from 'react';

import { Search, X } from 'lucide-react';

import { PrimaryInput, type PrimaryInputProps } from '../primary-input/primary-input';

// ─── Types ──────────────────────────────────────────────────────────────────

// Reuse every PrimaryInput prop; only the search-specific bits are added/overridden
// (prefix/suffix are owned by the search icon + clear button, onChange is simplified).
export type SearchInputProps = Omit<PrimaryInputProps, 'prefix' | 'suffix' | 'onChange'> & {
	value: string;
	onChange: (value: string) => void;
	onSearch?: (value: string) => void;
	onClear?: () => void;
	debounce?: number;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const SearchInput: React.FC<SearchInputProps> = ({
	value,
	onChange,
	onSearch,
	onClear,
	debounce = 300,
	placeholder = 'جستجو…',
	disabled = false,
	...rest
}) => {
	// ─── Refs ─────────────────────────────────────────────────────────────────

	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const mountedRef = useRef(false);
	const onSearchRef = useRef(onSearch);
	onSearchRef.current = onSearch;

	// ─── Effects ──────────────────────────────────────────────────────────────

	useEffect(() => {
		if (!mountedRef.current) {
			mountedRef.current = true;
			return;
		}
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => onSearchRef.current?.(value), debounce);

		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [value, debounce]);

	// ─── Handlers ─────────────────────────────────────────────────────────────

	const clearHandler = () => {
		if (disabled) return;
		onChange('');
		onClear?.();
		onSearchRef.current?.('');
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<PrimaryInput
			{...rest}
			value={value}
			onChange={(next) => onChange(next)}
			placeholder={placeholder}
			disabled={disabled}
			prefix={() => <Search size={16} className='shrink-0 text-text-tertiary' strokeWidth={2} />}
			suffix={
				value
					? () => (
							<button
								type='button'
								onClick={clearHandler}
								title='پاک کردن'
								aria-label='پاک کردن'
								className='shrink-0 cursor-pointer rounded-md text-text-tertiary transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30'
							>
								<X size={15} />
							</button>
						)
					: undefined
			}
		/>
	);
};
