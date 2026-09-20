'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { CloudAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { ActionTone, SimplePaginationProps } from '@/components/atom';
import { PrimarySkeleton, SimplePagination } from '@/components/atom';
import { motionPresets } from '@/lib';
import { cn } from '@/lib/utils';

import type { ActionListItem } from '../../lists/actions-list/actions-list';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DataCardBreakpoint = 'base' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type DataCardColumns = Partial<Record<DataCardBreakpoint, number>>;

export type DataCardProps<T> = {
	boxProps?: React.ComponentProps<'div'>;
	gridProps?: HTMLMotionProps<'div'>;
	//
	data?: T[];
	loading?: boolean;
	rowKey?: (item: T, index: number) => string | number;
	renderCard: (item: T, index: number) => React.ReactNode;
	onCardClick?: (item: T, index: number) => void;
	cardProps?: (item: T, index: number) => HTMLMotionProps<'div'>;

	columns?: DataCardColumns;
	actions?: (item: T, index: number) => ActionListItem[];

	emptyContent?: React.ReactNode;
	emptyIcon?: React.ReactNode;
	skeletonCount?: number;
	paginationProps?: SimplePaginationProps;
	footer?: React.ReactNode;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const defaultColumns: DataCardColumns = { base: 1, sm: 2, lg: 3 };

const columnClassMap: Record<DataCardBreakpoint, Record<number, string>> = {
	base: { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' },
	xs: { 1: 'xs:grid-cols-1', 2: 'xs:grid-cols-2', 3: 'xs:grid-cols-3', 4: 'xs:grid-cols-4' },
	sm: { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' },
	md: { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' },
	lg: { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' },
	xl: { 1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4' },
};

const resolveColumnsClass = (columns: DataCardColumns): string => {
	const merged = { ...defaultColumns, ...columns };
	return (Object.keys(merged) as DataCardBreakpoint[])
		.map((breakpoint) => {
			const count = merged[breakpoint];
			return count ? columnClassMap[breakpoint]?.[count] : undefined;
		})
		.filter(Boolean)
		.join(' ');
};

const isActionVisible = (action: ActionListItem): boolean =>
	(!('visible' in action) || action.visible !== false) && (!('access' in action) || action.access !== false);

// Static (JIT-safe) per-tone classes for the card's labeled action buttons (mirrors `ActionIconButton` tones).
const actionToneMap: Record<ActionTone, string> = {
	primary: 'border-primary/20 bg-primary/5 text-primary hover:border-primary/40 hover:bg-primary/10',
	success: 'border-success/20 bg-success/5 text-success hover:border-success/40 hover:bg-success/10',
	danger: 'border-danger/20 bg-danger/5 text-danger hover:border-danger/40 hover:bg-danger/10',
	warning:
		'border-warning/20 bg-warning/5 text-warning-70 dark:text-warning hover:border-warning/40 hover:bg-warning/10',
	info: 'border-info/20 bg-info/5 text-info hover:border-info/40 hover:bg-info/10',
	neutral:
		'border-divider/15 bg-surface-secondary/50 text-text-secondary hover:border-divider/40 hover:bg-surface-tertiary',
	default:
		'border-divider/15 bg-surface-secondary/50 text-text-secondary hover:border-primary/30 hover:bg-primary/8 hover:text-primary',
};

// Shared card-shell shape — transform/paint only on hover so layout never reflows.
const shellClass =
	'group/card relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-divider/15 bg-surface-secondary/40 px-4 pt-3 pb-2 shadow-sm';

// ─── Component ──────────────────────────────────────────────────────────────

export const DataCard = <T,>({
	boxProps,
	gridProps,
	//
	data = [],
	loading = false,
	rowKey,
	renderCard,
	onCardClick,
	cardProps,
	columns = defaultColumns,
	actions,
	emptyContent = 'موردی برای نمایش وجود ندارد',
	emptyIcon,
	skeletonCount = 6,
	paginationProps,
	footer,
}: DataCardProps<T>) => {
	const reduceMotion = useReducedMotion();

	// ─── Computed ─────────────────────────────────────────────────────────────

	const gridClass = cn('grid gap-4', resolveColumnsClass(columns), gridProps?.className);
	const hasFooter = !!footer || !!paginationProps?.total;

	// ─── Handlers ─────────────────────────────────────────────────────────────

	const cardKeyDownHandler = (e: React.KeyboardEvent<HTMLDivElement>, item: T, index: number) => {
		if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
		e.preventDefault();
		onCardClick?.(item, index);
	};

	// ─── Render Helpers ───────────────────────────────────────────────────────

	const renderAccent = (): React.ReactNode => (
		<span className='pointer-events-none absolute inset-x-0 top-0 h-0.5 origin-center scale-x-0 bg-primary transition-transform duration-500 ease-premium group-hover/card:scale-x-100' />
	);

	const renderActions = (item: T, index: number): React.ReactNode => {
		if (!actions) return null;
		const list = actions(item, index).filter(isActionVisible);
		if (!list.length) return null;
		const clickable = !!onCardClick;

		return (
			<div
				className='mt-auto flex flex-wrap gap-1.5 border-t border-divider/10 pt-2'
				onClick={clickable ? (e) => e.stopPropagation() : undefined}
			>
				{list.map((action, actionIndex) => {
					const Icon = action.icon;
					return (
						<button
							key={actionIndex}
							type='button'
							onClick={action.onClick}
							disabled={action.disabled}
							className={cn(
								'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5',
								'text-xs font-medium transition-colors duration-300',
								action.tone ? actionToneMap[action.tone] : actionToneMap['default'],
								action.disabled && 'pointer-events-none opacity-40',
							)}
						>
							{Icon && <Icon size={15} strokeWidth={1.75} className='shrink-0' />}
							{action.tooltip && <span>{action.tooltip}</span>}
						</button>
					);
				})}
			</div>
		);
	};

	const renderCardShell = (item: T, index: number): React.ReactNode => {
		const key = rowKey ? rowKey(item, index) : index;
		const clickable = !!onCardClick;
		const { className: itemClassName, ...itemRest } = cardProps?.(item, index) ?? {};

		return (
			<motion.div
				key={key}
				{...itemRest}
				variants={reduceMotion ? undefined : motionPresets.staggerItem()}
				role={clickable ? 'button' : itemRest.role}
				tabIndex={clickable ? 0 : itemRest.tabIndex}
				onClick={clickable ? () => onCardClick(item, index) : itemRest.onClick}
				onKeyDown={clickable ? (e) => cardKeyDownHandler(e, item, index) : itemRest.onKeyDown}
				className={cn(
					shellClass,
					'transition-[transform,box-shadow,border-color] duration-300 ease-premium',
					'hover:scale-101 hover:border-primary/30 hover:shadow-lg',
					clickable &&
						'cursor-pointer outline-none focus-visible:-translate-y-1 focus-visible:border-primary/40 focus-visible:shadow-lg',
					itemClassName,
				)}
			>
				{renderAccent()}
				{renderCard(item, index)}
				{renderActions(item, index)}
			</motion.div>
		);
	};

	const renderSkeletonCard = (index: number): React.ReactNode => (
		<div key={`skeleton-${index}`} className={shellClass}>
			<div className='flex items-start justify-between gap-3'>
				<div className='flex min-w-0 items-center gap-2.5'>
					<PrimarySkeleton boxProps={{ className: 'size-9' }} roundedClass='rounded-xl' />
					<PrimarySkeleton boxProps={{ className: 'h-3.5 w-24' }} roundedClass='rounded-full' />
				</div>
				<PrimarySkeleton boxProps={{ className: 'h-5 w-14' }} roundedClass='rounded-full' />
			</div>

			<div className='flex flex-col gap-2.5 rounded-xl bg-surface-secondary/50 border border-divider/10 p-3'>
				<PrimarySkeleton boxProps={{ className: 'h-3 w-full' }} roundedClass='rounded-full' />
				<PrimarySkeleton boxProps={{ className: 'h-3 w-2/3' }} roundedClass='rounded-full' />
			</div>

			<div className='mt-auto flex gap-1.5 border-t border-divider/10 pt-3'>
				<PrimarySkeleton boxProps={{ className: 'h-7 w-16' }} roundedClass='rounded-lg' />
				<PrimarySkeleton boxProps={{ className: 'h-7 w-16' }} roundedClass='rounded-lg' />
			</div>
		</div>
	);

	const renderEmpty = (): React.ReactNode => (
		<div className='flex flex-col items-center justify-center gap-4 rounded-2xl border border-divider/20 bg-surface-primary px-5 py-20 shadow-sm'>
			<div className='rounded-2xl border border-primary/10 bg-primary/5 p-4'>
				{emptyIcon || <CloudAlert size={32} strokeWidth={1.5} className='text-primary/50' />}
			</div>
			<p className='text-sm font-light text-text-tertiary'>{emptyContent}</p>
		</div>
	);

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div {...boxProps} className={cn('w-full', boxProps?.className)}>
			{loading ? (
				<div className={gridClass}>
					{Array.from({ length: skeletonCount }).map((_, index) => renderSkeletonCard(index))}
				</div>
			) : data.length === 0 ? (
				renderEmpty()
			) : (
				<motion.div
					{...gridProps}
					className={gridClass}
					variants={motionPresets.staggerContainer()}
					initial={reduceMotion ? false : 'hidden'}
					animate='visible'
				>
					{data.map(renderCardShell)}
				</motion.div>
			)}

			{hasFooter && (
				<div className='mt-4 flex items-center justify-between gap-4 rounded-xl border border-divider/15 bg-surface-secondary/40 px-5 py-2.5'>
					{footer}
					<SimplePagination
						{...paginationProps}
						boxProps={{
							...paginationProps?.boxProps,
							className: cn(paginationProps?.boxProps?.className, loading && 'pointer-events-none opacity-50', 'grow'),
						}}
					/>
				</div>
			)}
		</div>
	);
};

// ─── DataCardField ────────────────────────────────────────────────────────────

// Canonical label/value row for a card body — pairs with `DataCard.renderCard`.

export type DataCardFieldProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	icon?: LucideIcon;
	label: React.ReactNode;
	value: React.ReactNode;
	dir?: 'ltr' | 'rtl';
};

export const DataCardField: React.FC<DataCardFieldProps> = ({
	boxProps,
	//
	icon: Icon,
	label,
	value,
	dir,
}) => (
	<div {...boxProps} className={cn('flex items-center justify-between gap-3', boxProps?.className)}>
		<span className='flex shrink-0 items-center gap-1.5 text-xs text-text-tertiary'>
			{Icon && <Icon size={14} strokeWidth={1.75} />}
			{label}
		</span>
		<span dir={dir} className='truncate text-sm font-medium text-text-secondary'>
			{value}
		</span>
	</div>
);
