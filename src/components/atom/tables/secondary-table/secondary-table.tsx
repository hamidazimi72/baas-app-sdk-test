import type { ReactElement } from 'react';
import React from 'react';

import { Info } from 'lucide-react';

import type { SimplePaginationProps } from '@/components/atom';
import { SimplePagination, PrimarySkeleton } from '@/components/atom';
import { cn } from '@/lib/utils';

export type SecondaryTableProps = {
	children?: React.ReactNode;
	footer?: React.ReactNode;
	boxProps?: React.ComponentProps<'div'>;
	width?: string;
	height?: string;
	loading?: boolean;
	loadingTbodyEl?: React.ReactNode;
	emptyContent?: React.ReactNode;
	listLength?: number;
	paginationProps?: SimplePaginationProps;
};

export const SecondaryTable = ({
	children,
	footer,
	boxProps,
	width = 'min-w-[900px]',
	height = '', //'max-h-[600px]',
	loading = false,
	loadingTbodyEl,
	emptyContent,
	listLength,
	paginationProps,
}: SecondaryTableProps) => {
	const tableBasicClassName = {
		th: `
			[&>*:nth-child(1)]:min-h-12.5
			[&>*:nth-child(1)]:flex
			[&>*:nth-child(1)]:items-center
			[&>*:nth-child(1)]:justify-center
			[&>*:nth-child(1)]:sticky
			[&>*:nth-child(1)]:z-2
			[&>*:nth-child(1)]:top-0
		`,
		tr: `
			[&>*:nth-child(2)>*]:w-full
			[&>*:nth-child(2)>*]:flex
			[&>*:nth-child(2)>*]:items-center
			[&>*:nth-child(2)>*]:justify-center
		`,
		td: `
			[&>*:nth-child(1)>*]:w-full
			[&>*:nth-child(1)>*]:flex
			[&>*:nth-child(1)>*]:items-center
			[&>*:nth-child(1)>*]:justify-center
			[&>*:nth-child(1)>*]:break-all

			[&>*:nth-child(2)>*>*]:min-h-12.5
			[&>*:nth-child(2)>*>*]:w-full
			[&>*:nth-child(2)>*>*]:flex
			[&>*:nth-child(2)>*>*]:items-center
			[&>*:nth-child(2)>*>*]:justify-center
			[&>*:nth-child(2)>*>*]:break-all
		`,
		tdSize: `
			[&>*:nth-child(1)>*[data-grow='0.1']]:w-[10%]
			[&>*:nth-child(1)>*[data-grow='0.25']]:w-[25%]
			[&>*:nth-child(1)>*[data-grow='0.5']]:w-[50%]
			[&>*:nth-child(1)>*[data-grow='0.75']]:w-[75%]
			[&>*:nth-child(1)>*[data-grow='1']]:w-[100%]
			[&>*:nth-child(1)>*[data-grow='1.25']]:w-[125%]
			[&>*:nth-child(1)>*[data-grow='1.5']]:w-[150%]
			[&>*:nth-child(1)>*[data-grow='2']]:w-[200%]
			[&>*:nth-child(1)>*[data-grow='3']]:w-[300%]
			[&>*:nth-child(2)>*>*[data-grow='0.1']]:w-[10%]
			[&>*:nth-child(2)>*>*[data-grow='0.25']]:w-[25%]
			[&>*:nth-child(2)>*>*[data-grow='0.5']]:w-[50%]
			[&>*:nth-child(2)>*>*[data-grow='0.75']]:w-[75%]
			[&>*:nth-child(2)>*>*[data-grow='1']]:w-[100%]
			[&>*:nth-child(2)>*>*[data-grow='1.25']]:w-[125%]
			[&>*:nth-child(2)>*>*[data-grow='1.5']]:w-[150%]
			[&>*:nth-child(2)>*>*[data-grow='2']]:w-[200%]
			[&>*:nth-child(2)>*>*[data-grow='3']]:w-[300%]
		`,
	};

	const tableStyleClassName = {
		th: `
			[&>*:nth-child(1)]:text-text-primary
			[&>*:nth-child(1)]:bg-surface-secondary/50
			[&>*:nth-child(1)]:text-base
			[&>*:nth-child(1)]:border-b
			[&>*:nth-child(1)]:border-divider/30
			[&>*:nth-child(1)]:px-1
		`,
		tr: `[&>*:nth-child(2)>*]:px-1 [&>*:nth-child(2)>*:not(:last-child)]:border-b [&>*:nth-child(2)>*:not(:last-child)]:border-divider/30`,
		trN2: `[&>*:nth-child(2)>*:nth-child(2n)]:bg-surface-secondary/20`,
		// td: `
		// 	[&>*:nth-child(2)>*>*:not(:first-child)]:border-r
		// 	[&>*:nth-child(2)>*>*:not(:first-child)]:border-divider/30
		// 	[&>*:nth-child(2)>*>*:border-dashed
		// `,
		td: ``,
	};

	const header = (Array.isArray(children) ? children[0] : null) as ReactElement | null;
	const tdArray = (header?.props as any)?.children ?? [];
	const tdCount = tdArray.length || 0;

	const loadingEl = (
		<>
			{header}
			{loadingTbodyEl || (
				<div className='min-h-100'>
					{Array.from({ length: 9 }, (_, i) => (
						<div key={i}>
							{Array.from({ length: tdCount }, (_, i2) => {
								const tdProps = tdArray?.[i2]?.props;

								return (
									<div key={i2} data-grow={tdProps?.['data-grow'] ?? ''} className={cn(tdProps?.className)}>
										<PrimarySkeleton
											boxProps={{
												className: cn(
													'w-1/2 h-2.5',
													(tdProps?.className || '').includes('justify-start') ? 'text-start' : 'mx-auto',
												),
											}}
										/>
									</div>
								);
							})}
						</div>
					))}
				</div>
			)}
		</>
	);

	return (
		<div {...boxProps} className={cn('rounded-lg border border-divider/30 overflow-hidden', boxProps?.className)}>
			<div className={cn(height, 'overflow-auto')}>
				<div
					className={cn(
						tableBasicClassName.th,
						tableBasicClassName.tr,
						tableBasicClassName.td,
						tableBasicClassName.tdSize,
						tableStyleClassName.th,
						tableStyleClassName.tr,
						tableStyleClassName.td,
						tableStyleClassName.trN2,
						width,
					)}
				>
					{loading ? loadingEl : children}
				</div>
			</div>

			{!loading && listLength === 0 && (
				<div className='w-full min-h-50 flex items-center justify-center p-4'>
					{typeof emptyContent === 'string' ? (
						<div className='flex flex-col items-center justify-center gap-4'>
							<Info size={34} className='text-warning animate-blink' />
							<span className='text-text-tertiary text-xs'>{emptyContent}</span>
						</div>
					) : (
						emptyContent
					)}
				</div>
			)}

			{(footer || !!paginationProps?.total) && (
				<div
					className={cn(
						'border-t border-divider/30 px-4 py-2 min-h-10 flex items-center',
						loading && 'opacity-75 pointer-events-none',
					)}
				>
					<SimplePagination
						{...paginationProps}
						boxProps={{
							...paginationProps?.boxProps,
							className: cn(paginationProps?.boxProps?.className, 'grow'),
						}}
					/>
					{footer}
				</div>
			)}
		</div>
	);
};
