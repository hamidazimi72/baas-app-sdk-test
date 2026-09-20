import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type EmptyStateSize = 'sm' | 'md' | 'lg';

export type EmptyStateProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	icon?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	action?: ReactNode;
	size?: EmptyStateSize;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const EmptyState: React.FC<EmptyStateProps> = ({
	boxProps,
	//
	icon,
	title,
	description,
	action,
	size = 'md',
}) => {
	// ─── Computed ─────────────────────────────────────────────────────────────

	const sizeMap: Record<EmptyStateSize, { wrap: string; icon: string; title: string }> = {
		sm: { wrap: 'gap-2 py-6', icon: 'size-10', title: 'text-sm' },
		md: { wrap: 'gap-3 py-10', icon: 'size-14', title: 'text-base' },
		lg: { wrap: 'gap-4 py-16', icon: 'size-20', title: 'text-lg' },
	};

	const dims = sizeMap[size];

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div
			{...boxProps}
			className={cn('flex flex-col items-center justify-center px-4 text-center', dims.wrap, boxProps?.className)}
		>
			{icon && (
				<span
					className={cn(
						'flex items-center justify-center rounded-full bg-surface-tertiary text-text-tertiary ring-1 ring-divider/20',
						dims.icon,
					)}
				>
					{icon}
				</span>
			)}

			<p className={cn('font-semibold text-text-primary', dims.title)}>{title}</p>
			{description && <p className='max-w-sm text-sm text-text-tertiary'>{description}</p>}
			{action && <div className='mt-2 flex items-center justify-center gap-2'>{action}</div>}
		</div>
	);
};
