import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type StatusBadgeTone = 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'neutral';
export type StatusBadgeVariant = 'soft' | 'solid' | 'outline';
export type StatusBadgeSize = 'sm' | 'md' | 'lg';

export type StatusBadgeProps = {
	boxProps?: React.ComponentProps<'span'>;
	//
	label?: React.ReactNode;
	tone?: StatusBadgeTone;
	active?: boolean;
	variant?: StatusBadgeVariant;
	size?: StatusBadgeSize;
	dot?: boolean;
	pulse?: boolean;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const StatusBadge: React.FC<StatusBadgeProps> = ({
	boxProps,
	//
	label,
	tone,
	active,
	variant = 'soft',
	size = 'md',
	dot = true,
	pulse,
}) => {
	// ─── Computed ─────────────────────────────────────────────────────────────

	const resolvedTone: StatusBadgeTone = tone ?? (active === true ? 'success' : active === false ? 'danger' : 'neutral');
	const resolvedPulse = pulse ?? (resolvedTone === 'success' && active !== false);

	const sizeMap: Record<StatusBadgeSize, string> = {
		sm: 'gap-1 px-2 py-0.5 text-[11px]',
		md: 'gap-1.5 px-2.5 py-0.5 text-xs',
		lg: 'gap-2 px-3 py-1 text-sm',
	};

	const dotSizeMap: Record<StatusBadgeSize, string> = {
		sm: 'size-1.5',
		md: 'size-1.5',
		lg: 'size-2',
	};

	const softMap: Record<StatusBadgeTone, string> = {
		success: 'bg-success/10 text-success ring-success/20',
		danger: 'bg-danger/10 text-danger ring-danger/20',
		warning: 'bg-warning/10 text-warning ring-warning/20',
		info: 'bg-info/10 text-info ring-info/20',
		primary: 'bg-primary/10 text-primary ring-primary/20',
		neutral: 'bg-surface-tertiary text-text-secondary ring-divider/30',
	};

	const solidMap: Record<StatusBadgeTone, string> = {
		success: 'bg-success text-text-on-brand ring-success/30',
		danger: 'bg-danger text-text-on-brand ring-danger/30',
		warning: 'bg-warning text-text-on-brand ring-warning/30',
		info: 'bg-info text-text-on-brand ring-info/30',
		primary: 'bg-primary text-text-on-brand ring-primary/30',
		neutral: 'bg-divider text-text-on-brand ring-divider/30',
	};

	const outlineMap: Record<StatusBadgeTone, string> = {
		success: 'text-success ring-success/40',
		danger: 'text-danger ring-danger/40',
		warning: 'text-warning ring-warning/40',
		info: 'text-info ring-info/40',
		primary: 'text-primary ring-primary/40',
		neutral: 'text-text-secondary ring-divider/40',
	};

	const dotColorMap: Record<StatusBadgeTone, string> = {
		success: 'bg-success',
		danger: 'bg-danger',
		warning: 'bg-warning',
		info: 'bg-info',
		primary: 'bg-primary',
		neutral: 'bg-text-tertiary',
	};

	const variantMap: Record<StatusBadgeVariant, Record<StatusBadgeTone, string>> = {
		soft: softMap,
		solid: solidMap,
		outline: outlineMap,
	};

	const dotColor = variant === 'solid' ? 'bg-white' : dotColorMap[resolvedTone];

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<span
			{...boxProps}
			className={cn(
				'inline-flex items-center whitespace-nowrap rounded-lg align-middle font-medium ring-1 ring-inset',
				sizeMap[size],
				variantMap[variant][resolvedTone],
				boxProps?.className,
			)}
		>
			{dot && (
				<span className={cn('relative flex shrink-0 items-center justify-center', dotSizeMap[size])}>
					{resolvedPulse && (
						<span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', dotColor)} />
					)}
					<span className={cn('relative inline-flex size-full rounded-full', dotColor)} />
				</span>
			)}
			{label}
		</span>
	);
};
