'use client';

import type { ReactNode } from 'react';

import { motion, useReducedMotion } from 'framer-motion';

import { motionPresets } from '@/lib';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type TimelineTone = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';

export type TimelineItem = {
	title: ReactNode;
	time?: ReactNode;
	description?: ReactNode;
	icon?: ReactNode;
	tone?: TimelineTone;
};

export type TimelineProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	items: TimelineItem[];
};

// ─── Component ──────────────────────────────────────────────────────────────

export const Timeline: React.FC<TimelineProps> = ({
	boxProps,
	//
	items,
}) => {
	const reduceMotion = useReducedMotion();

	// ─── Computed ─────────────────────────────────────────────────────────────

	const toneMap: Record<TimelineTone, string> = {
		primary: 'bg-primary/10 text-primary',
		success: 'bg-success/10 text-success',
		danger: 'bg-danger/10 text-danger',
		warning: 'bg-warning/10 text-warning',
		info: 'bg-info/10 text-info',
		neutral: 'bg-surface-tertiary text-text-secondary',
	};

	// ─── Render Helpers ───────────────────────────────────────────────────────

	const renderItem = (item: TimelineItem, index: number) => {
		const tone = item.tone ?? 'primary';
		const isLast = index === items.length - 1;

		return (
			<motion.div key={index} variants={motionPresets.staggerItem()} className='flex gap-3'>
				<div className='flex flex-col items-center'>
					<span
						className={cn(
							'z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-surface-primary',
							toneMap[tone],
						)}
					>
						{item.icon}
					</span>
					{!isLast && <span className='w-px flex-1 bg-divider/30' />}
				</div>

				<div className={cn('flex-1', !isLast && 'pb-5')}>
					<div className='flex items-center justify-between gap-2'>
						<p className='text-sm font-medium text-text-primary'>{item.title}</p>
						{item.time && <span className='shrink-0 text-xs text-text-tertiary'>{item.time}</span>}
					</div>
					{item.description && <p className='mt-0.5 text-xs text-text-tertiary'>{item.description}</p>}
				</div>
			</motion.div>
		);
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div {...boxProps} className={cn(boxProps?.className)}>
			<motion.div
				className='flex flex-col'
				variants={motionPresets.staggerContainer()}
				initial={reduceMotion ? false : 'hidden'}
				animate='visible'
			>
				{items.map(renderItem)}
			</motion.div>
		</div>
	);
};
