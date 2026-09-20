'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { motionPresets } from '@/lib';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProgressBarTone = 'primary' | 'success' | 'danger' | 'warning' | 'info';
export type ProgressBarSize = 'sm' | 'md' | 'lg';

export type ProgressBarProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	value: number;
	tone?: ProgressBarTone;
	size?: ProgressBarSize;
	label?: React.ReactNode;
	showValue?: boolean;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const ProgressBar: React.FC<ProgressBarProps> = ({
	boxProps,
	//
	value,
	tone = 'primary',
	size = 'md',
	label,
	showValue = false,
}) => {
	const reduceMotion = useReducedMotion();

	// ─── Computed ─────────────────────────────────────────────────────────────

	const pct = Math.max(0, Math.min(100, Math.round(value)));

	const fillMap: Record<ProgressBarTone, string> = {
		primary: 'bg-primary',
		success: 'bg-success',
		danger: 'bg-danger',
		warning: 'bg-warning',
		info: 'bg-info',
	};

	const heightMap: Record<ProgressBarSize, string> = {
		sm: 'h-1.5',
		md: 'h-2.5',
		lg: 'h-3.5',
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div {...boxProps} className={cn('flex flex-col gap-1.5', boxProps?.className)}>
			{(label || showValue) && (
				<div className='flex items-center justify-between gap-2 text-xs text-text-tertiary'>
					{label && <span className='truncate'>{label}</span>}
					{showValue && <span className='shrink-0 font-medium tabular-nums text-text-secondary'>%{pct}</span>}
				</div>
			)}

			<div className={cn('w-full overflow-hidden rounded-full bg-surface-tertiary', heightMap[size])}>
				<motion.div
					className={cn('h-full rounded-full', fillMap[tone])}
					initial={{ width: reduceMotion ? `${pct}%` : 0 }}
					animate={{ width: `${pct}%` }}
					transition={{ duration: motionPresets.DURATION.slow, ease: motionPresets.EASE }}
				/>
			</div>
		</div>
	);
};
