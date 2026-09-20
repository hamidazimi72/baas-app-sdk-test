'use client';

import { useMemo, useState } from 'react';

import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';

import type { SimplePaginationProps } from '@/components/atom';
import { PrimaryTable } from '@/components/atom';
import { cn } from '@/lib/utils';

import type { ActionListItem, ActionsListProps } from '../../lists/actions-list/actions-list';
import { ActionsList } from '../../lists/actions-list/actions-list';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DataTableAlign = 'start' | 'center' | 'end';
export type DataTableSortDir = 'asc' | 'desc';
export type DataTableSortValue = string | number | boolean | Date | null | undefined;

export type DataTableColumn<T> = {
	header: React.ReactNode;
	render?: (item: T, index: number) => React.ReactNode;
	accessor?: keyof T | ((item: T) => React.ReactNode);
	align?: DataTableAlign;
	dir?: 'ltr' | 'rtl';
	className?: string;
	headerClassName?: string;
	width?: string;
	sortable?: boolean;
	sortAccessor?: (item: T) => DataTableSortValue;
};

export type DataTableProps<T> = {
	boxProps?: React.ComponentProps<'div'>;
	tableProps?: React.ComponentProps<'table'>;
	//
	columns: DataTableColumn<T>[];
	data?: T[];
	loading?: boolean;
	rowKey?: (item: T, index: number) => string | number;
	onRowClick?: (item: T, index: number) => void;
	rowProps?: (item: T, index: number) => React.ComponentProps<'tr'>;

	showIndex?: boolean;
	indexHeader?: React.ReactNode;
	actions?: (item: T, index: number) => ActionListItem[];
	actionsHeader?: React.ReactNode;
	actionsProps?: ActionsListProps;

	emptyContent?: React.ReactNode;
	emptyIcon?: React.ReactNode;
	paginationProps?: SimplePaginationProps;
	footer?: React.ReactNode;
};

type SortState = { index: number; dir: DataTableSortDir };

// ─── Helpers ────────────────────────────────────────────────────────────────

const alignMap: Record<DataTableAlign, string> = {
	start: 'text-start',
	center: 'text-center',
	end: 'text-end',
};

const compareValues = (a: DataTableSortValue, b: DataTableSortValue): number => {
	if (a === b) return 0;
	if (a === null || a === undefined) return 1;
	if (b === null || b === undefined) return -1;
	if (typeof a === 'number' && typeof b === 'number') return a - b;
	if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
	return String(a).localeCompare(String(b), 'fa', { numeric: true });
};

function resolveSortValue<T>(column: DataTableColumn<T>, item: T): DataTableSortValue {
	if (column.sortAccessor) return column.sortAccessor(item);
	if (column.accessor && typeof column.accessor !== 'function') return item[column.accessor] as DataTableSortValue;
	return undefined;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const DataTable = <T,>({
	boxProps,
	tableProps,
	//
	columns,
	data = [],
	loading = false,
	rowKey,
	onRowClick,
	rowProps,
	showIndex = true,
	indexHeader = 'ردیف',
	actions,
	actionsHeader = '',
	actionsProps,
	emptyContent = 'موردی برای نمایش وجود ندارد',
	emptyIcon,
	paginationProps,
	footer,
}: DataTableProps<T>) => {
	// ─── State ────────────────────────────────────────────────────────────────

	const [sort, setSort] = useState<SortState | null>(null);

	// ─── Computed ─────────────────────────────────────────────────────────────

	const sortedData = useMemo<T[]>(() => {
		const column = sort ? columns[sort.index] : undefined;
		if (!sort || !column) return data;
		const factor = sort.dir === 'asc' ? 1 : -1;
		return [...data].sort((a, b) => factor * compareValues(resolveSortValue(column, a), resolveSortValue(column, b)));
	}, [data, sort, columns]);

	// ─── Handlers ─────────────────────────────────────────────────────────────

	const toggleSortHandler = (index: number) => {
		const next: SortState | null =
			!sort || sort.index !== index ? { index, dir: 'asc' } : sort.dir === 'asc' ? { index, dir: 'desc' } : null;
		setSort(next);
	};

	const rowKeyDownHandler = (e: React.KeyboardEvent<HTMLTableRowElement>, item: T, index: number) => {
		if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
		e.preventDefault();
		onRowClick?.(item, index);
	};

	// ─── Render Helpers ───────────────────────────────────────────────────────

	const resolveCell = (column: DataTableColumn<T>, item: T, index: number): React.ReactNode => {
		if (column.render) return column.render(item, index);
		if (typeof column.accessor === 'function') return column.accessor(item);
		if (column.accessor) return (item[column.accessor] ?? '-') as React.ReactNode;
		return null;
	};

	const renderHeader = (column: DataTableColumn<T>, index: number): React.ReactNode => {
		if (!column.sortable)
			return column.headerClassName ? (
				<span key={index} className={column.headerClassName}>
					{column.header}
				</span>
			) : (
				<span key={index}>{column.header}</span>
			);

		const dir = sort && sort.index === index ? sort.dir : null;
		const Icon = dir === null ? ChevronsUpDown : dir === 'asc' ? ChevronUp : ChevronDown;

		return (
			<button
				key={index}
				type='button'
				onClick={() => toggleSortHandler(index)}
				title={typeof column.header === 'string' ? column.header : undefined}
				aria-label={dir ? (dir === 'asc' ? 'مرتب‌سازی صعودی' : 'مرتب‌سازی نزولی') : 'مرتب‌سازی'}
				className={cn(
					'group/sort -mx-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5',
					'cursor-pointer select-none transition-colors',
					dir ? 'bg-primary/8 text-primary' : 'hover:bg-primary/5 hover:text-text-secondary',
					column.headerClassName,
				)}
			>
				{column.header}
				<Icon
					size={14}
					strokeWidth={2}
					className={cn('shrink-0 transition-opacity', dir ? 'opacity-100' : 'opacity-40 group-hover/sort:opacity-80')}
				/>
			</button>
		);
	};

	const renderRow = (item: T, index: number): React.ReactNode => {
		const key = rowKey ? rowKey(item, index) : index;
		const extra = rowProps?.(item, index);
		const clickable = !!onRowClick;

		return (
			<tr
				{...extra}
				key={key}
				role={clickable ? 'button' : extra?.role}
				tabIndex={clickable ? 0 : extra?.tabIndex}
				onClick={clickable ? () => onRowClick(item, index) : extra?.onClick}
				onKeyDown={clickable ? (e) => rowKeyDownHandler(e, item, index) : extra?.onKeyDown}
				className={cn(
					'*:px-4 *:py-3.5 *:align-middle',
					clickable && 'cursor-pointer outline-none transition-colors focus-visible:bg-primary/5',
					extra?.className,
				)}
			>
				{showIndex && (
					<td key={`td-row-${index}`} className='w-12 text-sm tabular-nums text-text-tertiary'>
						{index + 1}
					</td>
				)}

				{columns.map((column, columnIndex) => (
					<td
						key={columnIndex}
						className={cn(
							'text-sm text-text-secondary',
							column.dir === 'ltr' && 'dir-ltr text-right',
							column.dir === 'rtl' && 'dir-rtl',
							column.align && alignMap[column.align],
							column.width,
							column.className,
						)}
					>
						{resolveCell(column, item, index)}
					</td>
				))}

				{actions && (
					<td
						key={`td-action-${index}`}
						className='w-px whitespace-nowrap'
						onClick={clickable ? (e) => e.stopPropagation() : undefined}
					>
						<ActionsList
							{...actionsProps}
							list={actions(item, index)}
							boxProps={{
								...actionsProps?.boxProps,
								className: cn('flex-nowrap', actionsProps?.boxProps?.className),
							}}
						/>
					</td>
				)}
			</tr>
		);
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	const headerData: React.ReactNode[] = [
		...(showIndex ? [indexHeader] : []),
		...columns.map(renderHeader),
		...(actions ? [actionsHeader] : []),
	];

	return (
		<PrimaryTable<T>
			boxProps={boxProps}
			tableProps={tableProps}
			loading={loading}
			headerData={headerData}
			bodyData={sortedData}
			rowKeyExtractor={rowKey}
			bodyRender={renderRow}
			emptyContent={emptyContent}
			emptyIcon={emptyIcon}
			paginationProps={paginationProps}
			footer={footer}
		/>
	);
};
