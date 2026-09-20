'use client';

import { useCallback, useState } from 'react';

import { Loader } from 'lucide-react';
import { motion } from 'framer-motion';

import { Popover } from '@/components/atom';
import { motionPresets } from '@/lib';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'link';
export type ButtonColor = 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export type PrimaryButtonProps = {
	boxProps?: React.ComponentProps<'div'>;

	children?: React.ReactNode;
	content?: string;

	variant?: ButtonVariant;
	color?: ButtonColor;
	size?: ButtonSize;

	loading?: boolean;
	disabled?: boolean;
	disabledMessage?: string;

	startIcon?: React.ReactNode;
	endIcon?: React.ReactNode;

	onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
	className?: string;
	type?: 'button' | 'submit' | 'reset';
};

// ─── Style Maps ───────────────────────────────────────────────────────────────

const sizeMap: Record<ButtonSize, string> = {
	xs: 'h-7   px-2.5 text-xs',
	sm: 'h-7.5 px-3   text-sm',
	md: 'h-10  px-4   text-sm',
	lg: 'h-12  px-6   text-base',
};

// Link buttons render inline as text — keep the font size, drop the button-box height/padding.
const linkSizeMap: Record<ButtonSize, string> = {
	xs: 'text-xs',
	sm: 'text-sm',
	md: 'text-sm',
	lg: 'text-base',
};

const solidMap: Record<ButtonColor, string> = {
	primary: 'bg-primary   text-text-on-brand hover:brightness-110 active:brightness-95',
	secondary: 'bg-secondary text-text-on-brand hover:brightness-110 active:brightness-95',
	tertiary: 'bg-tertiary  text-text-on-brand hover:brightness-110 active:brightness-95',
	success: 'bg-success   text-text-on-brand hover:brightness-110 active:brightness-95',
	danger: 'bg-danger    text-text-on-brand hover:brightness-110 active:brightness-95',
	warning: 'bg-warning   text-text-on-brand hover:brightness-110 active:brightness-95',
	info: 'bg-info      text-text-on-brand hover:brightness-110 active:brightness-95',
	neutral: 'bg-divider   text-text-on-brand hover:brightness-110 active:brightness-95',
};

const outlineMap: Record<ButtonColor, string> = {
	primary: 'border border-primary   text-primary   hover:bg-primary/10',
	secondary: 'border border-secondary text-secondary hover:bg-secondary/10',
	tertiary: 'border border-tertiary  text-tertiary  hover:bg-tertiary/10',
	success: 'border border-success   text-success   hover:bg-success/10',
	danger: 'border border-danger    text-danger    hover:bg-danger/10',
	warning: 'border border-warning   text-warning   hover:bg-warning/10',
	info: 'border border-info      text-info      hover:bg-info/10',
	neutral: 'border border-divider   text-divider   hover:bg-divider/10',
};

const ghostMap: Record<ButtonColor, string> = {
	primary: 'text-primary   hover:bg-primary/10',
	secondary: 'text-secondary hover:bg-secondary/10',
	tertiary: 'text-tertiary  hover:bg-tertiary/10',
	success: 'text-success   hover:bg-success/10',
	danger: 'text-danger    hover:bg-danger/10',
	warning: 'text-warning   hover:bg-warning/10',
	info: 'text-info      hover:bg-info/10',
	neutral: 'text-text-primary   hover:bg-text-primary/10',
};

const linkMap: Record<ButtonColor, string> = {
	primary: 'text-primary   hover:underline underline-offset-2',
	secondary: 'text-secondary hover:underline underline-offset-2',
	tertiary: 'text-tertiary  hover:underline underline-offset-2',
	success: 'text-success   hover:underline underline-offset-2',
	danger: 'text-danger    hover:underline underline-offset-2',
	warning: 'text-warning   hover:underline underline-offset-2',
	info: 'text-info      hover:underline underline-offset-2',
	neutral: 'text-divider   hover:underline underline-offset-2',
};

const variantMap = { solid: solidMap, outline: outlineMap, ghost: ghostMap, link: linkMap } as const;

// ─── Component ────────────────────────────────────────────────────────────────

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
	boxProps,
	children,
	content,
	variant = 'solid',
	color = 'primary',
	size = 'md',
	loading,
	disabled,
	disabledMessage,
	startIcon,
	endIcon,
	onClick,
	className,
	type = 'button',
}) => {
	const isDisabled = disabled || loading;
	const canShowPopover = !!disabled && !!disabledMessage;

	const [popoverOpen, popoverOpenDispatch] = useState(false);

	const clickHandler = useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			if (isDisabled) return;
			onClick?.(e);
		},
		[isDisabled, onClick],
	);

	const wrapperClickHandler = useCallback(() => {
		if (canShowPopover && !popoverOpen) popoverOpenDispatch(true);
	}, [canShowPopover, popoverOpen]);

	const popoverCloseHandler = useCallback(() => popoverOpenDispatch(false), []);

	const variantClass = variantMap[variant][color];
	const disabledClass = isDisabled ? 'opacity-60 saturate-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer';
	const linkMotion = variant === 'link';
	const sizeClass = linkMotion ? linkSizeMap[size] : sizeMap[size];

	return (
		<div {...boxProps} className={cn(boxProps?.className)}>
			<div className={cn('relative', canShowPopover && 'cursor-pointer')} onClick={wrapperClickHandler}>
				<motion.button
					type={type}
					disabled={!!isDisabled}
					onClick={clickHandler}
					whileHover={!isDisabled && !linkMotion ? motionPresets.hoverLift : undefined}
					whileTap={!isDisabled && !linkMotion ? motionPresets.tap : undefined}
					transition={motionPresets.SPRING}
					className={cn(
						'relative w-full flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-200 select-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/40',
						sizeClass,
						variantClass,
						disabledClass,
						className,
					)}
				>
					{loading && variant === 'solid' && (
						<motion.span
							className='absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent will-change-transform'
							initial={{ x: '-100%' }}
							animate={{ x: '100%' }}
							transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
						/>
					)}

					<span className='flex items-center gap-2'>
						{!!loading && <Loader size={15} strokeWidth={2.5} className='animate-spin' />}
						{!loading && startIcon}
						{content}
						{children}
						{endIcon}
					</span>
				</motion.button>

				{/* Disabled Popover */}
				{canShowPopover && popoverOpen && (
					<Popover onClose={popoverCloseHandler} placement='top' className='w-full flex items-center justify-center'>
						<div className='select-none min-h-6 min-w-37.5 text-xs font-medium flex items-center justify-center bg-surface-tertiary/50 rounded-lg overflow-hidden text-danger text-shadow-xs text-shadow-cancel'>
							<div className='grow bg-danger-100 dark:bg-danger-900 px-2 py-1 text-center'>{disabledMessage || ''}</div>
						</div>
					</Popover>
				)}
			</div>
		</div>
	);
};
