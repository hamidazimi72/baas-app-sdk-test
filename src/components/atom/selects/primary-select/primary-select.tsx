import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Eraser, X } from 'lucide-react';

import type { PrimaryInputProps } from '@/components/atom';
import { PrimaryCheckbox, PrimaryInput } from '@/components/atom';
import { cn } from '@/lib/utils';
import { motionPresets } from '@/lib';

// ─── Menu position ──────────────────────────────────────────────────────────

const MENU_MAX_HEIGHT = 220;
const MENU_GAP = 4;
const VIEWPORT_MARGIN = 8;

type MenuCoords = {
	left: number;
	width: number;
	maxHeight: number;
	openUp: boolean;
	top?: number;
	bottom?: number;
};

export type PrimarySelectProps<T extends Record<string, any>> = Omit<
	PrimaryInputProps,
	'boxProps' | 'value' | 'onChange' | 'readOnly'
> & {
	boxProps?: React.ComponentProps<'div'>;
	inputBoxProps?: React.ComponentProps<'div'>;

	readOnly?: boolean;

	options?: T[];
	onSuffix?: (item: T | null) => React.ReactNode;
	value?: any;
	item?: T | null;
	onChange?: (item: T | null) => void;

	multiSelect?: boolean;
	multiSelectDisplayCount?: number;
	selectedItems?: T[];
	onMultiChange?: (items: T[]) => void;

	valueProperty?: keyof T;
	nameProperty?: keyof T | (keyof T)[];
	badgeProperty?: keyof T;
	iconProperty?: keyof T;

	emptyOption?: boolean | string;
	checkAll?: boolean;
	noOptionLabel?: string;
	searchable?: boolean;
};

export const PrimarySelect = <T extends Record<string, any>>({
	boxProps,
	inputBoxProps,
	options = [],
	onSuffix,
	value = null,
	item,
	onChange,

	multiSelect = false,
	multiSelectDisplayCount = 1,
	selectedItems = [],
	onMultiChange,

	valueProperty = 'value',
	nameProperty = 'name',
	badgeProperty = 'badge',
	iconProperty = 'icon',

	emptyOption = false,
	checkAll,
	noOptionLabel = 'موردی یافت نشد',
	searchable = false,

	disabled,
	readOnly,

	...inputProps
}: PrimarySelectProps<T>) => {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const searchableRef = useRef<HTMLInputElement>(null);
	const [isOpen, setOpen] = useState(false);
	const [search, setSearch] = useState('');
	const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);

	const safeOptions = Array.isArray(options) ? options : [];
	const safeSelectedItems = Array.isArray(selectedItems) ? selectedItems : [];

	const getValue = (opt?: T | null) => {
		if (!opt || !valueProperty) return undefined;
		return opt?.[valueProperty];
	};

	const generateName = (opt?: T | null): string => {
		if (!opt) return '';
		if (Array.isArray(nameProperty))
			return nameProperty
				.map((k) => `${opt?.[k] ?? ''}`)
				.join(' ')
				.trim();
		return `${opt?.[nameProperty] ?? ''}`;
	};

	const selectedSingle = useMemo(() => {
		if (multiSelect) return null;

		if (item) {
			const itemValue = getValue(item);
			return safeOptions.find((o) => getValue(o) === itemValue) || null;
		}

		if (value !== null && value !== undefined) {
			return safeOptions.find((o) => getValue(o) === value) || null;
		}

		return null;
	}, [value, item, safeOptions, multiSelect]);

	const selectedMulti = useMemo(() => {
		if (!multiSelect) return [];
		return safeSelectedItems;
	}, [safeSelectedItems, multiSelect]);

	const displayValue = useMemo(() => {
		if (multiSelect) {
			if (!selectedMulti.length) return '';
			if (selectedMulti.length <= multiSelectDisplayCount) return selectedMulti.map(generateName).join('، ');

			const shown = selectedMulti.slice(0, multiSelectDisplayCount).map(generateName).join('، ');
			const remaining = selectedMulti.length - multiSelectDisplayCount;
			return `${shown} ... +${remaining}`;
		}
		return generateName(selectedSingle || item);
	}, [selectedSingle, selectedMulti, multiSelectDisplayCount]);

	const filteredOptions = useMemo(() => {
		if (!searchable || !search) return safeOptions;
		return safeOptions.filter((o) => generateName(o).includes(search));
	}, [search, safeOptions]);

	const isChecked = (opt: T) => {
		const val = getValue(opt);
		return safeSelectedItems.some((s) => getValue(s) === val);
	};

	const handleSelect = (opt: T | null) => {
		if (disabled || readOnly) return;

		if (multiSelect) {
			if (!opt) return;

			const val = getValue(opt);
			const exists = safeSelectedItems.some((s) => getValue(s) === val);

			const updated = exists ? safeSelectedItems.filter((s) => getValue(s) !== val) : [...safeSelectedItems, opt];

			onMultiChange?.(updated);
		} else {
			onChange?.(opt);
			setOpen(false);
		}
	};

	const updateMenuCoords = useCallback(() => {
		const rect = wrapperRef.current?.getBoundingClientRect();
		if (!rect) return;

		const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
		const spaceAbove = rect.top - VIEWPORT_MARGIN;
		const openUp = spaceBelow < MENU_MAX_HEIGHT && spaceAbove > spaceBelow;
		const maxHeight = Math.max(Math.min(MENU_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow), 0);

		setMenuCoords({
			left: rect.left,
			width: rect.width,
			maxHeight,
			openUp,
			top: openUp ? undefined : rect.bottom + MENU_GAP,
			bottom: openUp ? window.innerHeight - rect.top + MENU_GAP : undefined,
		});
	}, []);

	const openMenu = () => {
		if (disabled) return;
		updateMenuCoords();
		setOpen(true);
	};

	const toggleMenu = () => {
		if (disabled) return;
		if (isOpen) setOpen(false);
		else openMenu();
	};

	// Re-pin the fixed menu to the trigger while the page/modal scrolls or resizes.
	useEffect(() => {
		if (!isOpen) return;

		updateMenuCoords();
		const onReflow = () => updateMenuCoords();

		window.addEventListener('scroll', onReflow, { passive: true, capture: true });
		window.addEventListener('resize', onReflow, { passive: true });
		return () => {
			window.removeEventListener('scroll', onReflow, { capture: true });
			window.removeEventListener('resize', onReflow);
		};
	}, [isOpen, updateMenuCoords]);

	// Menu is portaled out of the wrapper → count both trigger and menu as "inside".
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			const target = e.target as Node;
			if (wrapperRef.current?.contains(target)) return;
			if (dropdownRef.current?.contains(target)) return;
			setOpen(false);
		};
		document.addEventListener('click', handler);
		return () => document.removeEventListener('click', handler);
	}, []);

	useEffect(() => {
		if (isOpen && searchable) searchableRef?.current?.focus();
	}, [isOpen]);

	return (
		<div {...boxProps} className={cn(boxProps?.className)}>
			<div ref={wrapperRef} className='relative'>
				<PrimaryInput
					{...inputProps}
					value={displayValue}
					readOnly
					disabled={disabled}
					onFocus={openMenu}
					suffix={
						<div className='flex items-center justify-center gap-1'>
							<ChevronDown
								className={cn('transition-transform duration-200 ease-premium', isOpen && 'rotate-180')}
								size={18}
								onClick={toggleMenu}
							/>
						</div>
					}
					boxProps={{
						...inputBoxProps,
						className: cn('cursor-pointer', inputBoxProps?.className),
					}}
				/>
			</div>

			{typeof document !== 'undefined' &&
				createPortal(
					<AnimatePresence>
						{isOpen && !disabled && menuCoords && (
							<motion.div
								ref={dropdownRef}
								initial={{ opacity: 0, y: menuCoords.openUp ? 6 : -6, scale: 0.98 }}
								animate={{ opacity: 1, y: 0, scale: 1 }}
								exit={{ opacity: 0, y: menuCoords.openUp ? 6 : -6, scale: 0.98 }}
								transition={{ duration: motionPresets.DURATION.fast, ease: motionPresets.EASE }}
								style={{
									position: 'fixed',
									left: menuCoords.left,
									top: menuCoords.top,
									bottom: menuCoords.bottom,
									width: menuCoords.width,
									maxHeight: menuCoords.maxHeight,
									transformOrigin: menuCoords.openUp ? 'bottom' : 'top',
								}}
								className={cn(
									'z-9999 overflow-y-auto rounded-lg border border-divider/30 bg-surface-secondary shadow-lg',
								)}
							>
								{emptyOption && !multiSelect && selectedSingle && (
									<div
										className='flex items-center gap-2 px-3 py-2 text-danger cursor-pointer hover:bg-surface-secondary border-b border-divider/10'
										onClick={() => handleSelect(null)}
									>
										<X size={14} />
										{typeof emptyOption === 'string' ? emptyOption : 'پاک کردن'}
									</div>
								)}

								{searchable && (
									<div className='flex items-center sticky top-0 z-211 min-h-10 bg-surface-primary w-full px-3 py-2 border-b border-divider/30 '>
										{multiSelect && checkAll && selectedItems?.length < options?.length && (
											<PrimaryCheckbox
												boxProps={{ className: 'ml-2' }}
												value={false}
												onChange={() => onMultiChange?.(options || [])}
											/>
										)}
										<input
											className='outline-none grow'
											placeholder='جستجو...'
											ref={searchableRef}
											value={search}
											onChange={(e) => setSearch(e.target.value)}
										/>
										{multiSelect && emptyOption && !!selectedItems?.length && (
											<Eraser
												size={20}
												className='cursor-pointer text-danger/70 hover:text-danger shrink-0'
												onClick={() => onMultiChange?.([])}
											/>
										)}
									</div>
								)}

								{filteredOptions.length === 0 && <div className='px-3 py-2 opacity-50'>{noOptionLabel}</div>}

								{filteredOptions.map((opt, i) => {
									const hasBadge = !!opt?.[badgeProperty] || opt?.[badgeProperty] === 0;

									return (
										<div
											key={i}
											onClick={() => handleSelect(opt)}
											className='relative flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-primary/50 border-b border-dashed border-divider/10 last:border-b-0'
										>
											{multiSelect && <PrimaryCheckbox readOnly value={isChecked(opt)} />}

											{opt?.[iconProperty] && (
												// Option icon URL is data-driven (any host) → plain <img>; lazy-loaded.
												<img src={opt?.[iconProperty]} alt='' loading='lazy' decoding='async' className='w-4 h-4' />
											)}

											<span className='select-none'>{generateName(opt)}</span>

											{hasBadge && (
												<span className='py-0.5 px-2 min-w-0.5 min-h-5 font-medium flex items-center justify-center rounded-lg bg-primary text-xs'>
													{opt?.[badgeProperty] ?? ''}
												</span>
											)}

											{onSuffix && (
												<div
													className='mr-auto h-full'
													onClick={(e) => e.stopPropagation()}
													onMouseDown={(e) => e.stopPropagation()}
												>
													{onSuffix?.(opt)}
												</div>
											)}
										</div>
									);
								})}
							</motion.div>
						)}
					</AnimatePresence>,
					document.body,
				)}
		</div>
	);
};
