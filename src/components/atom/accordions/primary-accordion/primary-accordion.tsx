'use client';

import React from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronUp } from 'lucide-react';

import { motionPresets } from '@/lib';
import { cn } from '@/lib/utils';

export type PrimaryAccordionProps = {
	children?: React.ReactNode;
	// ui
	boxProps?: React.ComponentProps<'div'>;
	iconProps?: React.ComponentProps<'span'>;
	rounded?: string;
	border?: string;
	expandBorderColor?: string;
	collapseBorderColor?: string;
	disabledBorderColor?: string;
	// logic
	collapse?: boolean;
	disabled?: boolean;
	onChange?: ((collapse: boolean) => any) | null;
};

export const PrimaryAccordion: React.FC<PrimaryAccordionProps> = ({
	children,
	//ui
	boxProps,
	iconProps,
	rounded = 'rounded-lg',
	border = 'border-2',
	expandBorderColor = 'border-divider/40',
	collapseBorderColor = 'border-divider/20',
	disabledBorderColor = 'border-divider/10',
	//logic
	collapse = true,
	disabled = false,
	onChange = () => {},
}) => {
	const header = children?.[0] || null;
	const body = children?.[1] || null;

	const borderClass = cn(
		border,
		(disabled && disabledBorderColor) || (collapse && collapseBorderColor) || (!collapse && expandBorderColor),
	);

	return (
		<div
			{...boxProps}
			className={cn(boxProps?.className, borderClass, rounded, !disabled && 'cursor-pointer', 'relative')}
			onClick={() => onChange && !disabled && onChange(!collapse)}
		>
			{!disabled && (
				<ChevronUp
					className={cn(
						iconProps?.className,
						collapse && 'rotate-180',
						'absolute left-2 top-[calc(50%-10px)] transition-transform duration-300 ease-premium',
					)}
					size={20}
					strokeWidth='2px'
				/>
			)}
			{header}
			<AnimatePresence initial={false}>
				{!collapse && (
					<motion.div
						variants={motionPresets.expandHeight()}
						initial='hidden'
						animate='visible'
						exit='exit'
						className='overflow-hidden'
					>
						{body}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};
