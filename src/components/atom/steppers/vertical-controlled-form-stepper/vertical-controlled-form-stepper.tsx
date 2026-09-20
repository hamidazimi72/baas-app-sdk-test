'use client';

import React from 'react';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PencilIcon } from 'lucide-react';

import { motionPresets } from '@/lib';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type VerticalControlledFormStepperStatus = 'default' | 'active' | 'done';

export type VerticalControlledFormStepperStep = {
	title: React.ReactNode;
	content: React.ReactNode;
	counter?: React.ReactNode;
	isValid?: boolean;
};

export type VerticalControlledFormStepperProps = {
	boxProps?: React.ComponentProps<'ol'>;
	//
	steps: (VerticalControlledFormStepperStep | undefined | false)[];
	activeIndex: number;
	onChangeActiveIndex: (index: number) => void;
	size?: 'sm' | 'md' | 'lg';
	connector?: boolean;
	animate?: boolean;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const VerticalControlledFormStepper: React.FC<VerticalControlledFormStepperProps> = ({
	boxProps,
	//
	steps,
	activeIndex,
	onChangeActiveIndex,
	size = 'md',
	connector = true,
	animate = true,
}) => {
	// ─── Computed ─────────────────────────────────────────────────────────────

	const reduceMotion = useReducedMotion();
	const motionOn = animate && !reduceMotion;

	const sizeMap: Record<NonNullable<VerticalControlledFormStepperProps['size']>, Record<string, string>> = {
		sm: {
			gap: 'gap-2.5',
			badge: 'size-6 rounded-md text-sm',
			icon: 'size-3.5',
			row: 'min-h-6',
			title: 'text-sm',
			padR: 'pr-3',
			contentPad: 'py-1',
		},
		md: {
			gap: 'gap-3',
			badge: 'size-8 rounded-md text-sm',
			icon: 'size-4',
			row: 'min-h-8',
			title: 'text-sm',
			padR: 'pr-4',
			contentPad: 'py-2',
		},
		lg: {
			gap: 'gap-4',
			badge: 'size-9 rounded-lg text-base',
			icon: 'size-4.5',
			row: 'min-h-9',
			title: 'text-lg',
			padR: 'pr-4.5',
			contentPad: 'py-3',
		},
	};

	const toneMap: Record<VerticalControlledFormStepperStatus, string> = {
		default: 'bg-surface-tertiary text-text-tertiary',
		active: 'bg-warning/30 text-text-tertiary',
		done: 'bg-warning/30 text-text-tertiary',
	};

	const sz = sizeMap[size];

	const filteredSteps = (steps || []).filter((item): item is VerticalControlledFormStepperStep => Boolean(item));

	// ─── Handlers ─────────────────────────────────────────────────────────────

	const canNavigateTo = (index: number): boolean => {
		if (index <= activeIndex) return true;
		return filteredSteps.slice(activeIndex, index).every((step) => step.isValid);
	};

	const handleStepClick = (index: number) => {
		if (index === activeIndex || !canNavigateTo(index)) return;
		onChangeActiveIndex(index);
	};

	// ─── Render Helpers ───────────────────────────────────────────────────────

	const resolveStatus = (index: number): VerticalControlledFormStepperStatus => {
		if (index < activeIndex) return 'done';
		if (index === activeIndex) return 'active';
		return 'default';
	};

	const renderStep = (step: VerticalControlledFormStepperStep, index: number) => {
		const status = resolveStatus(index);
		const isOpen = index === activeIndex;
		const isLast = index === filteredSteps.length - 1;
		const clickable = !isOpen && canNavigateTo(index);

		return (
			<motion.li
				key={index}
				variants={motionOn ? motionPresets.staggerItem() : undefined}
				className='flex flex-col'
				data-status={status}
			>
				<div className={cn('flex', sz.gap)}>
					<button
						type='button'
						disabled={!clickable}
						onClick={() => handleStepClick(index)}
						aria-label={status === 'done' ? 'Edit step' : undefined}
						className={cn(
							'flex shrink-0 select-none items-center justify-center font-medium tabular-nums transition-colors duration-300 ease-premium',
							clickable ? 'cursor-pointer' : 'cursor-default',
							sz.badge,
							toneMap[status],
						)}
					>
						{status === 'done' ? <PencilIcon className={sz.icon} /> : (step.counter ?? index + 1)}
					</button>
					<div className={cn('flex items-center font-medium text-text-primary', sz.row, sz.title)}>{step.title}</div>
				</div>

				<AnimatePresence initial={false} mode='popLayout'>
					{isOpen ? (
						<motion.div
							key='content'
							initial={motionOn ? { height: 0, opacity: 0 } : false}
							animate={{ height: 'auto', opacity: 1 }}
							exit={motionOn ? { height: 0, opacity: 0 } : undefined}
							transition={{ duration: 0.3, ease: 'easeInOut' }}
							className='overflow-hidden'
						>
							<div className={cn('flex pt-3', sz.gap, sz.padR)}>
								{connector && (
									<span aria-hidden className={cn('w-px shrink-0 self-stretch rounded-full', toneMap[status])} />
								)}
								<div className={cn('flex-1', sz.contentPad)}>{step.content}</div>
							</div>
						</motion.div>
					) : (
						connector &&
						!isLast && (
							<motion.div
								key='mini-connector'
								initial={motionOn ? { height: 0, opacity: 0 } : false}
								animate={{ height: 'auto', opacity: 1 }}
								exit={motionOn ? { height: 0, opacity: 0 } : undefined}
								transition={{ duration: 0.3, ease: 'easeInOut' }}
								className='overflow-hidden'
							>
								<div className={cn('flex pt-1.5', sz.padR)}>
									<span aria-hidden className={cn('h-5 w-px shrink-0 rounded-full', toneMap[status])} />
								</div>
							</motion.div>
						)
					)}
				</AnimatePresence>
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
