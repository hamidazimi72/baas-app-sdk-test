import { Fragment } from 'react';

import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CardAction = {
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
	variant?: 'default' | 'info' | 'warning' | 'danger';
};

export type CardActionFooterProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	actions: CardAction[];
};

// ─── Component ──────────────────────────────────────────────────────────────

export const CardActionFooter: React.FC<CardActionFooterProps> = ({
	boxProps,
	//
	actions,
}) => {
	// ─── Computed ─────────────────────────────────────────────────────────────

	const variantMap: Record<NonNullable<CardAction['variant']>, string> = {
		default: 'hover:bg-secondary/50 hover:text-text-primary',
		info: 'hover:bg-info/10 hover:text-info',
		warning: 'hover:bg-warning/10 hover:text-warning',
		danger: 'hover:bg-danger/10 hover:text-danger',
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div
			{...boxProps}
			className={cn(
				'flex items-center justify-end gap-1 border-t border-divider/20 pt-2 font-medium',
				boxProps?.className,
			)}
		>
			{actions.map((action, index) => (
				<Fragment key={action.label}>
					{index > 0 && <span className='h-3 w-px bg-divider/30' />}
					<button
						type='button'
						onClick={action.onClick}
						className={cn(
							'grow flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-xs text-text-tertiary transition-colors duration-150',
							variantMap[action.variant ?? 'default'],
						)}
					>
						{action.icon} {action.label}
					</button>
				</Fragment>
			))}
		</div>
	);
};
