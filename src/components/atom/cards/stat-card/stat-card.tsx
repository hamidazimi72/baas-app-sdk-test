import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { CountUp } from '../../counters/count-up/count-up';

// ─── Types ──────────────────────────────────────────────────────────────────

export type StatCardTone = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';

export type StatCardProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	label: ReactNode;
	value: number;
	icon?: ReactNode;
	tone?: StatCardTone;
	hint?: ReactNode;
	suffix?: ReactNode;
	loading?: boolean;
	delay?: number;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const StatCard: React.FC<StatCardProps> = ({
	boxProps,
	//
	label,
	value,
	icon,
	tone = 'primary',
	hint,
	suffix,
	loading = false,
	delay = 0,
}) => {
	// ─── Computed ─────────────────────────────────────────────────────────────

	const iconToneMap: Record<StatCardTone, string> = {
		primary: 'bg-primary/10 text-primary',
		success: 'bg-success/10 text-success',
		danger: 'bg-danger/10 text-danger',
		warning: 'bg-warning/10 text-warning',
		info: 'bg-info/10 text-info',
		neutral: 'bg-surface-tertiary text-text-secondary',
	};

	const glowToneMap: Record<StatCardTone, string> = {
		primary: 'from-primary/8',
		success: 'from-success/8',
		danger: 'from-danger/8',
		warning: 'from-warning/8',
		info: 'from-info/8',
		neutral: 'from-divider/8',
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div
			{...boxProps}
			className={cn(
				'group relative overflow-hidden rounded-2xl border border-divider/20 bg-surface-primary p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md',
				boxProps?.className,
			)}
		>
			<span
				className={cn(
					'pointer-events-none absolute -top-12 -inset-e-12 size-32 rounded-full bg-linear-to-br to-transparent opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-100',
					glowToneMap[tone],
				)}
			/>

			<div className='relative flex items-start justify-between gap-3'>
				<div className='min-w-0'>
					<p className='truncate text-xs text-text-tertiary'>{label}</p>

					<div className='mt-1.5 flex items-baseline gap-1'>
						{loading ? (
							<span className='inline-block h-7 w-16 animate-pulse rounded-md bg-surface-tertiary' />
						) : (
							<span className='text-2xl font-bold text-text-primary'>
								<CountUp value={value} delay={delay} />
							</span>
						)}
						{suffix && <span className='text-sm text-text-tertiary'>{suffix}</span>}
					</div>

					{hint && <p className='mt-1 truncate text-xs text-text-tertiary'>{hint}</p>}
				</div>

				{icon && (
					<span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', iconToneMap[tone])}>
						{icon}
					</span>
				)}
			</div>
		</div>
	);
};
