'use client';

import React from 'react';

import type { HTMLMotionProps } from 'framer-motion';
import { motion } from 'framer-motion';
import type { LucideIcon, LucideProps } from 'lucide-react';

import type { PrimaryTooltipProps } from '@/components/atom';
import { PrimaryTooltip } from '@/components/atom';
import { motionPresets } from '@/lib';
import { cn } from '@/lib/utils';

export type ActionTone = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'default';

export type ActionIconButtonProps = {
	boxProps?: HTMLMotionProps<'div'>;
	icon?: LucideIcon;
	iconProps?: Omit<LucideProps, 'ref'>;
	tooltip?: React.ReactNode;
	tooltipProps?: PrimaryTooltipProps;
	onClick?: () => void;
	disabled?: boolean;
	tone?: ActionTone;
	textColor?: string;
	bgColor?: string;
	borderColor?: string;
	tooltipTextColor?: string;
	tooltipBgColor?: string;
	tooltipBorderColor?: string;
};

// Static (JIT-safe) per-tone color sets for toned actions; rest = tone color, hover = intensified.
const toneColorMap: Record<ActionTone, { text: string; bg: string; border: string }> = {
	primary: {
		text: 'text-primary',
		bg: 'bg-transparent hover:bg-primary/10',
		border: 'border-transparent hover:border-primary/20',
	},
	success: {
		text: 'text-success',
		bg: 'bg-transparent hover:bg-success/10',
		border: 'border-transparent hover:border-success/20',
	},
	danger: {
		text: 'text-danger',
		bg: 'bg-danger/5 hover:bg-danger/20',
		border: 'border-danger/10 hover:border-danger/30',
	},
	warning: {
		text: 'text-warning',
		bg: 'bg-transparent hover:bg-warning/10',
		border: 'border-transparent hover:border-warning/20',
	},
	info: { text: 'text-info', bg: 'bg-transparent hover:bg-info/10', border: 'border-transparent hover:border-info/20' },
	neutral: {
		text: 'text-text-secondary hover:text-text-primary',
		bg: 'bg-transparent hover:bg-surface-tertiary',
		border: 'border-transparent hover:border-divider/30',
	},
	default: {
		text: 'text-text-secondary hover:text-primary',
		bg: 'bg-transparent hover:bg-primary/8',
		border: 'border-transparent hover:border-primary/15',
	},
};

export const ActionIconButton: React.FC<ActionIconButtonProps> = ({
	boxProps,
	icon: Icon,
	iconProps,
	tooltip,
	tooltipProps,
	onClick,
	disabled,
	tone,
	textColor,
	bgColor,
	borderColor,
	tooltipTextColor = 'text-text-primary',
	tooltipBgColor = 'bg-surface-primary',
	tooltipBorderColor = 'border-divider/30',
}) => {
	const toneColor = tone ? toneColorMap[tone] : toneColorMap['default'];

	const _textColor = textColor ?? toneColor?.text ?? 'text-text-secondary hover:text-primary';
	const _bgColor = bgColor ?? toneColor?.bg ?? 'bg-transparent hover:bg-primary/8';
	const _borderColor = borderColor ?? toneColor?.border ?? 'border-transparent hover:border-primary/15';

	// Accessible name from the tooltip when it's plain text (keeps icon-only buttons announced).
	const ariaLabel = typeof tooltip === 'string' ? tooltip : undefined;

	// Kept as a motion.div (its `boxProps` type is div-bound) but made keyboard-operable:
	// role/tabIndex/Enter+Space make it behave as a button without changing the public prop type.
	const keyDownHandler = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (disabled || (e.key !== 'Enter' && e.key !== ' ')) return;
		e.preventDefault();
		onClick?.();
	};

	const content = (
		<motion.div
			{...boxProps}
			role='button'
			tabIndex={disabled ? -1 : 0}
			aria-disabled={disabled}
			aria-label={ariaLabel}
			className={cn(
				_textColor,
				_bgColor,
				_borderColor,
				'border rounded-lg',
				'flex items-center justify-center cursor-pointer',
				'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
				'min-w-8 min-h-8 p-1.5',
				disabled && 'pointer-events-none opacity-40',
				boxProps?.className,
			)}
			onClick={onClick}
			onKeyDown={keyDownHandler}
			whileHover={!disabled ? motionPresets.hoverPop : undefined}
			whileTap={!disabled ? motionPresets.tap : undefined}
		>
			{Icon && <Icon {...iconProps} size={iconProps?.size ?? 18} strokeWidth={iconProps?.strokeWidth ?? 1.5} />}
		</motion.div>
	);

	return tooltip ? (
		<PrimaryTooltip
			{...tooltipProps}
			content={tooltip}
			contentProps={{
				...tooltipProps?.contentProps,
				className: cn(
					tooltipProps?.contentProps?.className,
					tooltipTextColor,
					tooltipBgColor,
					tooltipBorderColor,
					'text-xs border rounded-lg px-2.5 py-1.5 shadow-sm',
				),
			}}
		>
			{content}
		</PrimaryTooltip>
	) : (
		content
	);
};
