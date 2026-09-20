'use client';

import React from 'react';

import { motion, useReducedMotion } from 'framer-motion';

import { motionPresets } from '@/lib';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type VerticalFormStepperStatus = 'default' | 'active' | 'done';

export type VerticalFormStepperStep = {
	title: React.ReactNode;
	content: React.ReactNode;
	counter?: React.ReactNode;
	status?: VerticalFormStepperStatus;
};

export type VerticalFormStepperProps = {
	boxProps?: React.ComponentProps<'ol'>;
	//
	steps: (VerticalFormStepperStep | undefined | false)[];
	activeIndex?: number;
	size?: 'sm' | 'md' | 'lg';
	connector?: boolean;
	animate?: boolean;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const VerticalFormStepper: React.FC<VerticalFormStepperProps> = ({
	boxProps,
	//
	steps,
	activeIndex,
	size = 'md',
	connector = true,
	animate = true,
}) => {
	// ─── Computed ─────────────────────────────────────────────────────────────

	const reduceMotion = useReducedMotion();
	const motionOn = animate && !reduceMotion;

	const sizeMap: Record<NonNullable<VerticalFormStepperProps['size']>, Record<string, string>> = {
		sm: {
			gap: 'gap-2.5',
			badge: 'size-6 rounded-md text-sm',
			row: 'min-h-6',
			title: 'text-sm',
			padR: 'pr-3',
			contentPad: 'py-1',
		},
		md: {
			gap: 'gap-3',
			badge: 'size-8 rounded-md text-sm',
			row: 'min-h-8',
			title: 'text-sm',
			padR: 'pr-4',
			contentPad: 'py-2',
		},
		lg: {
			gap: 'gap-4',
			badge: 'size-9 rounded-lg text-base',
			row: 'min-h-9',
			title: 'text-lg',
			padR: 'pr-4.5',
			contentPad: 'py-3',
		},
	};

	const toneMap: Record<VerticalFormStepperStatus, string> = {
		default: 'bg-surface-tertiary text-text-tertiary',
		active: 'bg-warning/20 text-text-tertiary',
		done: 'bg-success/20 text-text-tertiary',
	};

	const sz = sizeMap[size];

	const filteredSteps = (steps || []).filter((item): item is VerticalFormStepperStep => Boolean(item));

	// ─── Render Helpers ───────────────────────────────────────────────────────

	const resolveStatus = (step: VerticalFormStepperStep, index: number): VerticalFormStepperStatus => {
		if (step.status) return step.status;
		if (activeIndex == null) return 'default';
		if (index < activeIndex) return 'done';
		if (index === activeIndex) return 'active';
		return 'default';
	};

	const renderStep = (step: VerticalFormStepperStep, index: number) => {
		const status = resolveStatus(step, index);
		// const isLast = index === filteredSteps.length - 1;

		return (
			<motion.li
				key={index}
				variants={motionOn ? motionPresets.staggerItem() : undefined}
				className={cn('flex flex-col', sz.gap)}
				data-status={status}
			>
				<div className={cn('flex', sz.gap)}>
					<span
						className={cn(
							'flex shrink-0 select-none items-center justify-center font-medium tabular-nums transition-colors duration-300 ease-premium',
							sz.badge,
							toneMap[status],
						)}
					>
						{step.counter ?? index + 1}
					</span>
					<div className={cn('flex items-center font-medium text-text-primary', sz.row, sz.title)}>{step.title}</div>
				</div>

				<div className={cn('flex', sz.gap, sz.padR)}>
					{connector && <span aria-hidden className={cn('self-stretch w-px shrink-0 rounded-full', toneMap[status])} />}
					<div className={cn('flex-1', sz.contentPad)}>{step.content}</div>
				</div>
			</motion.li>
		);
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<motion.ol
			{...(boxProps as React.ComponentProps<typeof motion.ol>)}
			variants={motionOn ? motionPresets.staggerContainer() : undefined}
			initial={motionOn ? 'hidden' : false}
			animate={motionOn ? 'visible' : false}
			className={cn('flex flex-col', sz.gap, boxProps?.className)}
		>
			{filteredSteps.map(renderStep)}
		</motion.ol>
	);
};
