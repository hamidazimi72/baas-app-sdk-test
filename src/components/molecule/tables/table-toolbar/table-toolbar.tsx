import type { ReactNode } from 'react';

import type { SearchInputProps } from '@/components/atom';
import { SearchInput } from '@/components/atom';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type TableToolbarProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	search?: SearchInputProps;
	filters?: ReactNode;
	actions?: ReactNode;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const TableToolbar: React.FC<TableToolbarProps> = ({
	boxProps,
	//
	search,
	filters,
	actions,
}) => {
	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div
			{...boxProps}
			className={cn(
				'mb-3 px-3 py-4 bg-surface-secondary/50 border border-divider/20 rounded-xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
				boxProps?.className,
			)}
		>
			<div className='flex flex-1 flex-wrap items-center gap-2'>
				{search && (
					<SearchInput
						{...search}
						boxProps={{
							...search.boxProps,
							className: cn('w-full sm:max-w-xs', search.boxProps?.className),
						}}
					/>
				)}
				{filters}
			</div>

			{actions && <div className='flex shrink-0 flex-wrap items-center self-end gap-2'>{actions}</div>}
		</div>
	);
};
