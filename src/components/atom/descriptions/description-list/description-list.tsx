'use client';

import { useState } from 'react';

import type { LucideIcon } from 'lucide-react';
import { Check, Copy } from 'lucide-react';

import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DescriptionItem = {
	label: React.ReactNode;
	value: React.ReactNode;
	icon?: LucideIcon;
	dir?: 'ltr' | 'rtl';
	copyable?: boolean;
	copyValue?: string;
	fullWidth?: boolean;
	hideInEmpty?: boolean;
};

export type DescriptionListProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	items: DescriptionItem[];
	columns?: 1 | 2 | 3;
	layout?: 'row' | 'stack';
};

// ─── Component ──────────────────────────────────────────────────────────────

export const DescriptionList: React.FC<DescriptionListProps> = ({
	boxProps,
	//
	items = [],
	columns = 2,
	layout = 'row',
}) => {
	const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

	// ─── Computed ─────────────────────────────────────────────────────────────

	const columnsMap: Record<NonNullable<DescriptionListProps['columns']>, string> = {
		1: 'grid-cols-1',
		2: 'grid-cols-1 md:grid-cols-2',
		3: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
	};

	const isStack = layout === 'stack';

	// ─── Handlers ─────────────────────────────────────────────────────────────

	const copyHandler = (index: number, value: string) => {
		if (!value) return;
		navigator.clipboard?.writeText(value);
		setCopiedIndex(index);
		setTimeout(() => setCopiedIndex((current) => (current === index ? null : current)), 1800);
	};

	// ─── Render Helpers ──────────────────────────────────────────────────────

	const resolveCopyValue = (item: DescriptionItem): string => {
		if (item.copyValue) return item.copyValue;
		if (typeof item.value === 'string' || typeof item.value === 'number') return String(item.value);
		return '';
	};

	const renderItem = (item: DescriptionItem, index: number) => {
		const Icon = item.icon;
		const copied = copiedIndex === index;
		const copyValue = resolveCopyValue(item);

		if (item?.hideInEmpty && !item?.value) return;

		return (
			<div
				key={index}
				className={cn(
					'group/desc relative overflow-hidden rounded-lg border border-divider/30 bg-surface-primary px-3 py-3 transition-all duration-200 hover:border-primary/30 hover:bg-surface-primary/50',
					isStack ? 'flex flex-col gap-1.5' : 'flex items-center justify-between gap-3 col-span-1',
					item.fullWidth && `sm:col-span-2 xl:col-span-[${columns}]`,
				)}
			>
				<span className='pointer-events-none absolute inset-y-0 inset-s-0 w-0.5 bg-linear-to-b from-primary/0 via-primary/50 to-primary/0 opacity-0 transition-opacity duration-200 group-hover/desc:opacity-100' />

				<span className='flex shrink-0 items-center gap-1.5 text-xs text-text-tertiary'>
					{Icon && <Icon size={14} strokeWidth={1.75} className='shrink-0 opacity-80' />}
					{item.label}
				</span>

				<span className='flex min-w-0 items-center gap-1.5'>
					<span
						className={cn(
							'truncate text-sm font-semibold text-text-primary',
							item.dir === 'ltr' && 'dir-ltr text-right',
							item.dir === 'rtl' && 'dir-rtl',
						)}
					>
						{item.value}
					</span>

					{item.copyable && !!copyValue && (
						<button
							type='button'
							onClick={() => copyHandler(index, copyValue)}
							title='کپی'
							aria-label='کپی'
							className='shrink-0 text-text-tertiary transition-colors hover:text-primary'
						>
							{copied ? <Check size={14} className='text-success' /> : <Copy size={14} />}
						</button>
					)}
				</span>
			</div>
		);
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div {...boxProps} className={cn('grid gap-2.5', columnsMap[columns], boxProps?.className)}>
			{items.map(renderItem)}
		</div>
	);
};
