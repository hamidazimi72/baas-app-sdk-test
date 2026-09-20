import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { motionPresets } from '@/lib';

const MENU_MAX_HEIGHT = 220;

export type SecondarySelectRenderCtx<T> = {
	item: T | null;
	label: string;
	isOpen: boolean;
	disabled?: boolean;
	placeholder?: string;
};

export type SecondarySelectProps<T extends Record<string, any>> = {
	boxProps?: React.ComponentProps<'div'>;
	selectedItemProps?: React.ComponentProps<'div'>;
	renderSelected?: (ctx: SecondarySelectRenderCtx<T>) => React.ReactNode;

	placeholder?: string;
	disabled?: boolean;
	readOnly?: boolean;

	options?: T[];
	value?: any;
	onChange?: (item: T | null) => void;

	valueProperty?: keyof T;
	nameProperty?: keyof T | (keyof T)[];
	iconProperty?: keyof T;

	emptyOption?: boolean | string;
	noOptionLabel?: string;
	searchable?: boolean;
	PrefixIcon?: LucideIcon | ((item: T) => React.ReactNode);
};

export const SecondarySelect = <T extends Record<string, any>>({
	boxProps,
	selectedItemProps,
	renderSelected,
	placeholder = 'انتخاب کنید',
	options = [],
	value = null,
	onChange,
	valueProperty = 'value',
	nameProperty = 'name',
	iconProperty = 'icon',
	emptyOption = false,
	noOptionLabel = 'موردی یافت نشد',
	searchable = false,
	disabled,
	readOnly,
	PrefixIcon,
}: SecondarySelectProps<T>) => {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);

	const [isOpen, setOpen] = useState(false);
	const [search, setSearch] = useState('');
	const [coords, setCoords] = useState({ left: 0, top: 0, width: 0, openUp: false });

	const isLocked = disabled || readOnly;

	const getValue = (opt?: T | null) => opt?.[valueProperty];
	const getName = (opt?: T | null): string =>
		!opt
			? ''
			: Array.isArray(nameProperty)
				? nameProperty
						.map((k) => opt[k] ?? '')
						.join(' ')
						.trim()
				: `${opt[nameProperty] ?? ''}`;

	const selectedItem = useMemo(() => options.find((o) => getValue(o) === value) ?? null, [options, value]);

	const filteredOptions = useMemo(
		() => (searchable && search ? options.filter((o) => getName(o).includes(search)) : options),
		[options, search, searchable],
	);

	const updateCoords = useCallback(() => {
		const rect = wrapperRef.current?.getBoundingClientRect();
		if (!rect) return;
		const openUp = window.innerHeight - rect.bottom < MENU_MAX_HEIGHT && rect.top > window.innerHeight - rect.bottom;
		setCoords({ left: rect.left, width: rect.width, openUp, top: openUp ? rect.top - 4 : rect.bottom + 4 });
	}, []);

	const toggleMenu = () => {
		if (isLocked) return;
		if (!isOpen) updateCoords();
		setOpen((o) => !o);
	};

	const handleSelect = (opt: T | null) => {
		onChange?.(opt);
		setSearch('');
		setOpen(false);
	};

	useEffect(() => {
		if (!isOpen) return;

		const onClickOutside = (e: MouseEvent) => {
			const t = e.target as Node;
			if (!wrapperRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
		};

		if (searchable) searchRef.current?.focus();
		document.addEventListener('click', onClickOutside);
		window.addEventListener('scroll', updateCoords, true);
		window.addEventListener('resize', updateCoords);
		return () => {
			document.removeEventListener('click', onClickOutside);
			window.removeEventListener('scroll', updateCoords, true);
			window.removeEventListener('resize', updateCoords);
		};
	}, [isOpen, searchable, updateCoords]);

	const label = getName(selectedItem);

	const prefixIconRenderer = (item: T | null, size: number) => {
		if (!PrefixIcon || !item) return null;
		if (typeof PrefixIcon === 'function') return PrefixIcon(item);
		const Icon = PrefixIcon as LucideIcon;
		return <Icon size={size} strokeWidth={2.5} className='text-primary' />;
	};

	return (
		<div {...boxProps}>
			<div
				ref={wrapperRef}
				onClick={toggleMenu}
				aria-haspopup='listbox'
				aria-expanded={isOpen}
				className={cn(disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}
			>
				{renderSelected ? (
					renderSelected({ item: selectedItem, label, isOpen, disabled, placeholder })
				) : (
					<div
						{...selectedItemProps}
						className={cn(
							'flex min-h-10 items-center justify-between gap-2 rounded-lg border border-divider/10 bg-surface-primary px-3 py-2 transition-colors',
							isOpen && 'border-primary/30',
							selectedItem ? 'bg-secondary/20' : '',
							selectedItemProps?.className,
						)}
					>
						{prefixIconRenderer(selectedItem, 18)}
						<span className={cn('truncate select-none', !!selectedItem ? 'text-primary' : 'text-text-tertiary')}>
							{label || placeholder}
						</span>
						<ChevronDown size={18} className={cn('shrink-0 transition-transform', isOpen && 'rotate-180')} />
					</div>
				)}
			</div>

			{createPortal(
				<AnimatePresence>
					{isOpen && (
						<motion.div
							ref={menuRef}
							role='listbox'
							initial={{ opacity: 0, y: coords.openUp ? 6 : -6 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: coords.openUp ? 6 : -6 }}
							transition={{ duration: motionPresets.DURATION.fast, ease: motionPresets.EASE }}
							style={{
								position: 'fixed',
								left: coords.left,
								top: coords.top,
								width: coords.width,
								maxHeight: MENU_MAX_HEIGHT,
								transform: coords.openUp ? 'translateY(-100%)' : undefined,
							}}
							className='z-9999 overflow-y-auto rounded-lg border border-divider/30 bg-surface-primary shadow-lg'
						>
							{searchable && (
								<div className='sticky top-0 border-b border-divider/30 bg-surface-primary/50 px-3 py-2'>
									<input
										ref={searchRef}
										className='w-full outline-none'
										placeholder='جستجو...'
										value={search}
										onChange={(e) => setSearch(e.target.value)}
									/>
								</div>
							)}

							{placeholder && selectedItem && (
								<div className='min-h-7 bg-divider/5 flex items-center text-text-tertiary/80 text-xs border-b border-divider/10 indent-2'>
									{placeholder}
								</div>
							)}

							{emptyOption && (
								<div
									className='flex cursor-pointer items-center gap-2 px-3 py-2 text-danger hover:bg-surface-primary/50'
									onClick={() => handleSelect(null)}
								>
									<X size={14} />
									{typeof emptyOption === 'string' ? emptyOption : 'پاک کردن'}
								</div>
							)}

							{filteredOptions.length === 0 && <div className='px-3 py-2 opacity-50'>{noOptionLabel}</div>}

							{filteredOptions.map((opt, i) => (
								<div
									key={`${getValue(opt) ?? i}`}
									role='option'
									aria-selected={getValue(opt) === value}
									onClick={() => handleSelect(opt)}
									className={cn(
										'flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-secondary/20',
										getValue(opt) === value && 'bg-surface-primary/40',
									)}
								>
									{prefixIconRenderer(opt, 16)}
									{opt[iconProperty] && <img src={opt[iconProperty]} alt='' className='h-4 w-4' loading='lazy' />}
									<span className='select-none'>{getName(opt)}</span>
								</div>
							))}
						</motion.div>
					)}
				</AnimatePresence>,
				document.body,
			)}
		</div>
	);
};
