import type { ReactNode } from 'react';

import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type TagTone = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
export type TagSize = 'sm' | 'md';

export type TagProps = {
	boxProps?: React.ComponentProps<'span'>;
	//
	label: ReactNode;
	tone?: TagTone;
	size?: TagSize;
	icon?: ReactNode;
	onRemove?: () => void;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const Tag: React.FC<TagProps> = ({
	boxProps,
	//
	label,
	tone = 'neutral',
	size = 'md',
	icon,
	onRemove,
}) => {
	// ─── Computed ─────────────────────────────────────────────────────────────

	const toneMap: Record<TagTone, string> = {
		primary: 'bg-primary/10 text-primary ring-primary/20',
		success: 'bg-success/10 text-success ring-success/20',
		danger: 'bg-danger/10 text-danger ring-danger/20',
		warning: 'bg-warning/10 text-warning ring-warning/20',
		info: 'bg-info/10 text-info ring-info/20',
		neutral: 'bg-surface-tertiary text-text-secondary ring-divider/30',
	};

	const sizeMap: Record<TagSize, string> = {
		sm: 'gap-1 px-2 py-0.5 text-[11px]',
		md: 'gap-1.5 px-2.5 py-0.5 text-xs',
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<span
			{...boxProps}
			className={cn(
				'inline-flex items-center whitespace-nowrap rounded-md align-middle font-medium ring-1 ring-inset',
				sizeMap[size],
				toneMap[tone],
				boxProps?.className,
			)}
		>
			{icon && <span className='flex shrink-0 items-center'>{icon}</span>}
			{label}

			{onRemove && (
				<button
					type='button'
					onClick={onRemove}
					title='حذف'
					aria-label='حذف'
					className='-me-0.5 shrink-0 cursor-pointer rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none'
				>
					<X size={size === 'sm' ? 11 : 13} strokeWidth={2.5} />
				</button>
			)}
		</span>
	);
};
