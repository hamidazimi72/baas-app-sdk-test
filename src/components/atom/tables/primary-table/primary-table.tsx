'use client';

import React, { useCallback, useMemo } from 'react';
import { CloudAlert } from 'lucide-react';

import type { SimplePaginationProps } from '@/components/atom';
import { PrimarySkeleton, SimplePagination } from '@/components/atom';
import { cn } from '@/lib/utils';

export type PrimaryTableProps<B = unknown, H = string | React.ReactNode> = {
	boxProps?: React.ComponentProps<'div'>;
	tableProps?: React.ComponentProps<'table'>;

	loading?: boolean;
	emptyContent?: React.ReactNode;
	emptyIcon?: React.ReactNode;

	headerData?: H[];
	headerRender?: (item: H, index: number) => React.ReactNode;
	headerProps?: React.ComponentProps<'thead'>;

	bodyData?: B[];
	bodyRender?: (item: B, index: number) => React.ReactNode;
	bodyProps?: React.ComponentProps<'tbody'>;
	rowKeyExtractor?: (item: B, index: number) => string | number;

	footer?: React.ReactNode;
	footerProps?: React.ComponentProps<'div'>;
	paginationProps?: SimplePaginationProps;
};

export const PrimaryTable = <B = unknown, H = string | React.ReactNode>({
	boxProps,
	tableProps,

	loading = false,
	emptyContent = 'هیچ داده‌ای یافت نشد',
	emptyIcon,

	headerData = [],
	headerRender,
	headerProps,

	bodyData = [],
	bodyRender,
	bodyProps,
	rowKeyExtractor,

	footer,
	footerProps,
	paginationProps,
}: PrimaryTableProps<B, H>) => {
	// ─── Render Helpers ──────────────────────────────────────────────────

	const renderHeaderCell = useCallback(
		(item: H, index: number): React.ReactNode => {
			if (headerRender) return headerRender(item, index);
			if (typeof item === 'string' || typeof item === 'number') {
				return <span className='font-semibold tracking-wide'>{item}</span>;
			}
			return item as React.ReactNode;
		},
		[headerRender],
	);

	const renderBodyRow = useCallback(
		(item: B, index: number): React.ReactNode => {
			if (!bodyRender) {
				return (
					<tr key={index}>
						<td colSpan={headerData.length} className='px-5 py-4 text-center text-sm text-text-secondary'>
							Body render function is required
						</td>
					</tr>
				);
			}
			return bodyRender(item, index);
		},
		[bodyRender, headerData.length],
	);

	const renderSkeletonRows = useCallback((): React.ReactNode => {
		const rowCount = bodyData?.length || 5;
		return Array.from({ length: rowCount }).map((_, rowIndex) => (
			<tr key={`skeleton-${rowIndex}`}>
				{headerData.map((_, colIndex) => (
					<td key={`skeleton-cell-${rowIndex}-${colIndex}`} className='border-b border-divider/10'>
						<div className='flex items-center min-h-13 px-5'>
							<PrimarySkeleton
								boxProps={{
									className: cn(
										'h-2.5 rounded-full',
										colIndex === 0 ? 'w-3/5' : colIndex % 3 === 1 ? 'w-2/5' : 'w-2/3',
									),
								}}
							/>
						</div>
					</td>
				))}
			</tr>
		));
	}, [bodyData?.length, headerData]);

	const renderEmptyState = useCallback(
		(): React.ReactNode => (
			<tr>
				<td colSpan={Math.max(headerData.length, 1)} className='px-5 py-20'>
					<div className='flex flex-col items-center justify-center gap-4'>
						<div className='p-4 rounded-2xl bg-primary/5 border border-primary/10'>
							{emptyIcon || <CloudAlert size={32} strokeWidth={1.5} className='text-primary/50' />}
						</div>
						<p className='text-sm text-text-tertiary font-light'>{emptyContent}</p>
					</div>
				</td>
			</tr>
		),
		[emptyContent, emptyIcon, headerData.length],
	);

	const hasFooter = useMemo(() => footer || !!paginationProps?.total, [footer, paginationProps?.total]);

	return (
		<div {...boxProps} className={cn('w-full', boxProps?.className)}>
			{/* ─── Table Outer Wrapper ─── */}
			<div className='w-full overflow-hidden rounded-xl border border-divider/20 bg-surface-primary shadow-sm'>
				{/* ─── Scroll Container (Fixed RTL horizontal ghost scroll) ─── */}
				<div className='w-full overflow-x-auto style-scrollbar'>
					<table
						{...tableProps}
						className={cn('w-full table-auto border-separate border-spacing-0 align-middle', tableProps?.className)}
					>
						{/* ─── Header ─── */}
						{headerData.length > 0 && (
							<thead {...headerProps} className={cn('bg-surface-secondary/70', headerProps?.className)}>
								<tr>
									{headerData.map((item, index) => (
										<th
											key={`header-cell-${index}`}
											className='px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-tertiary border-b border-divider/20 whitespace-nowrap'
										>
											{renderHeaderCell(item, index)}
										</th>
									))}
								</tr>
							</thead>
						)}

						{/* ─── Body ─── */}
						<tbody
							{...bodyProps}
							className={cn(
								'[&>tr]:transition-colors [&>tr]:duration-150',
								'[&>tr:hover]:bg-primary/3',
								// ایجاد خط جداکننده به صورت دستی به دلیل ساختار border-separate
								'[&>tr>td]:border-b [&>tr>td]:border-divider/10 [&>tr:last-child>td]:border-b-0',
								bodyProps?.className,
							)}
						>
							{loading ? (
								renderSkeletonRows()
							) : bodyData.length === 0 ? (
								renderEmptyState()
							) : (
								<>
									{bodyData.map((item, index) => {
										const key = rowKeyExtractor ? rowKeyExtractor(item, index) : index;
										return <React.Fragment key={key}>{renderBodyRow(item, index)}</React.Fragment>;
									})}
								</>
							)}
						</tbody>
					</table>
				</div>

				{/* ─── Footer ─── */}
				{hasFooter && (
					<div
						{...footerProps}
						className={cn(
							'border-t border-divider/15 bg-surface-secondary/40 px-5 py-2.5 min-h-11 flex items-center justify-between gap-4',
							footerProps?.className,
						)}
					>
						{footer}
						<SimplePagination
							{...paginationProps}
							boxProps={{
								...paginationProps?.boxProps,
								className: cn(
									paginationProps?.boxProps?.className,
									loading && 'pointer-events-none opacity-50',
									'grow',
								),
							}}
						/>
					</div>
				)}
			</div>
		</div>
	);
};
