'use client';

import { useEffect, useState } from 'react';
import { XCircle } from 'lucide-react';
import type { HTMLMotionProps } from 'framer-motion';
import { motion, AnimatePresence } from 'framer-motion';

import { motionPresets } from '@/lib';
import { cn } from '@/lib/utils';

export type PrimaryDrawerProps = {
	boxProps?: React.ComponentProps<'div'>;

	onClose?: () => void;
	onCloseDisabled?: boolean;
	hideCloseIcon?: boolean;
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
	backdrop?: 'transparent' | 'opaque' | 'blur';
	backdropDisable?: boolean;

	side?: 'left' | 'right' | 'top' | 'bottom';

	contentProps?: HTMLMotionProps<'div'>;
	header?: string | ((onClose: () => void) => React.ReactNode);
	headerProps?: HTMLMotionProps<'div'>;
	body?: (onClose: () => void) => React.ReactNode;
	bodyProps?: HTMLMotionProps<'div'>;
	footer?: (onClose: () => void) => React.ReactNode;
	footerProps?: HTMLMotionProps<'div'>;
};

export const PrimaryDrawer: React.FC<PrimaryDrawerProps> = ({
	boxProps,

	onClose,
	onCloseDisabled,
	hideCloseIcon,
	size = 'md',
	backdrop = 'opaque',
	backdropDisable = false,

	side = 'right',

	contentProps,
	header,
	headerProps,
	body,
	bodyProps,
	footer,
	footerProps,
}) => {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		const timer = requestAnimationFrame(() => setIsVisible(true));

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && !backdropDisable && !onCloseDisabled) {
				closeHandler();
			}
		};

		document.addEventListener('keydown', handleEscape);
		document.body.style.overflow = 'hidden';

		return () => {
			cancelAnimationFrame(timer);
			document.removeEventListener('keydown', handleEscape);
			document.body.style.overflow = '';
		};
	}, [backdropDisable, onCloseDisabled]);

	const closeHandler = () => {
		if (onCloseDisabled) return;

		setIsVisible(false);

		setTimeout(() => {
			onClose?.();
		}, 400);
	};

	const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (backdropDisable || e.target !== e.currentTarget) return;
		closeHandler();
	};

	//----------* ClassNames *----------//
	const isHorizontal = side === 'left' || side === 'right';

	const sizeClassName = isHorizontal
		? (size === 'xs' && 'w-xs') ||
			(size === 'sm' && 'w-sm') ||
			(size === 'md' && 'w-md') ||
			(size === 'lg' && 'w-lg') ||
			(size === 'xl' && 'w-xl') ||
			(size === '2xl' && 'w-2xl') ||
			(size === '3xl' && 'w-3xl') ||
			(size === '4xl' && 'w-4xl') ||
			(size === '5xl' && 'w-5xl') ||
			(size === 'full' && 'w-full') ||
			'w-md'
		: (size === 'xs' && 'h-xs') ||
			(size === 'sm' && 'h-sm') ||
			(size === 'md' && 'h-md') ||
			(size === 'lg' && 'h-lg') ||
			(size === 'xl' && 'h-xl') ||
			(size === '2xl' && 'h-2xl') ||
			(size === '3xl' && 'h-3xl') ||
			(size === '4xl' && 'h-4xl') ||
			(size === '5xl' && 'h-5xl') ||
			(size === 'full' && 'h-full') ||
			'h-md';

	const maxSizeClassName = isHorizontal ? 'max-w-[90vw] h-dvh' : 'w-screen max-h-[90dvh]';

	const positionClassName =
		(side === 'left' && 'left-0 top-0') ||
		(side === 'right' && 'right-0 top-0') ||
		(side === 'top' && 'top-0 left-0') ||
		(side === 'bottom' && 'bottom-0 left-0') ||
		'right-0 top-0';

	const roundedClassName =
		(side === 'left' && 'rounded-r-lg') ||
		(side === 'right' && 'rounded-l-lg') ||
		(side === 'top' && 'rounded-b-lg') ||
		(side === 'bottom' && 'rounded-t-lg') ||
		'rounded-l-lg';

	const backdropClassName =
		(backdrop === 'transparent' && 'bg-transparent') ||
		(backdrop === 'opaque' && 'bg-divider/80') ||
		(backdrop === 'blur' && 'bg-divider/60 backdrop-blur-md') ||
		'bg-divider/80';

	const closeButtonPositionClassName =
		(side === 'left' && 'right-3 top-3') ||
		(side === 'right' && 'left-3 top-3') ||
		(side === 'top' && 'left-3 bottom-3') ||
		(side === 'bottom' && 'left-3 top-3') ||
		'left-3 top-3';

	const headerRoundedClassName =
		(side === 'left' && 'rounded-tr-lg') ||
		(side === 'right' && 'rounded-tl-lg') ||
		(side === 'top' && 'rounded-b-lg') ||
		(side === 'bottom' && 'rounded-t-lg') ||
		'rounded-tl-lg';

	//----------* Animation Variants *----------//
	const backdropVariants = {
		hidden: { opacity: 0 },
		visible: { opacity: 1 },
		exit: { opacity: 0 },
	};

	const contentVariants = {
		hidden:
			side === 'left'
				? { x: '-100%', opacity: 0.8 }
				: side === 'right'
					? { x: '100%', opacity: 0.8 }
					: side === 'top'
						? { y: '-100%', opacity: 0.8 }
						: { y: '100%', opacity: 0.8 },
		visible: {
			x: 0,
			y: 0,
			opacity: 1,
		},
		exit:
			side === 'left'
				? { x: '-100%', opacity: 0.5 }
				: side === 'right'
					? { x: '100%', opacity: 0.5 }
					: side === 'top'
						? { y: '-100%', opacity: 0.5 }
						: { y: '100%', opacity: 0.5 },
	};

	const headerVariants = {
		hidden: isHorizontal ? { opacity: 0, x: side === 'left' ? -30 : 30 } : { opacity: 0, y: side === 'top' ? -30 : 30 },
		visible: {
			opacity: 1,
			x: 0,
			y: 0,
			transition: { delay: 0.1, duration: 0.3 },
		},
	};

	const bodyVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: { delay: 0.15, duration: 0.3 },
		},
	};

	const footerVariants = {
		hidden: isHorizontal ? { opacity: 0, x: side === 'left' ? -30 : 30 } : { opacity: 0, y: side === 'top' ? -30 : 30 },
		visible: {
			opacity: 1,
			x: 0,
			y: 0,
			transition: { delay: 0.2, duration: 0.3 },
		},
	};

	return (
		<div {...boxProps} className={cn(boxProps?.className)}>
			<AnimatePresence mode='wait'>
				{isVisible && (
					<motion.div
						className={cn(backdropClassName, 'fixed inset-0 z-50')}
						variants={backdropVariants}
						initial='hidden'
						animate='visible'
						exit='exit'
						transition={{ duration: motionPresets.DURATION.base, ease: motionPresets.EASE_IN_OUT }}
						onClick={handleBackdropClick}
					>
						<motion.div
							{...(contentProps as any)}
							className={cn(
								contentProps?.className,
								sizeClassName,
								maxSizeClassName,
								positionClassName,
								roundedClassName,
								'bg-surface-secondary border border-divider/30 shadow-2xl fixed flex flex-col overflow-hidden',
							)}
							variants={contentVariants}
							initial='hidden'
							animate='visible'
							exit='exit'
							transition={{
								duration: 0.4,
								ease: [0.32, 0.72, 0, 1],
							}}
							onClick={(e) => e.stopPropagation()}
						>
							{/* Close Button */}
							{!hideCloseIcon && (
								<motion.button
									disabled={onCloseDisabled}
									onClick={closeHandler}
									className={cn(
										closeButtonPositionClassName,
										'absolute z-10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none group',
									)}
									aria-label='Close'
									whileHover={{ scale: 1.1, rotate: 90 }}
									whileTap={{ scale: 0.95 }}
									transition={{ duration: 0.2 }}
								>
									<XCircle
										size={32}
										strokeWidth={1.5}
										className='text-text-tertiary group-hover:text-danger transition-colors duration-200'
									/>
								</motion.button>
							)}

							{/* Header */}
							{header && (
								<motion.div
									{...headerProps}
									className={cn(
										headerProps?.className,
										typeof header === 'string' &&
											cn(
												'min-h-12 w-full flex items-center px-4 py-2 bg-primary',
												headerRoundedClassName,
												'border-b border-divider/30',
											),
									)}
									variants={headerVariants}
									initial='hidden'
									animate='visible'
								>
									{typeof header === 'string' ? (
										<div className='text-base text-surface-primary dark:text-text-primary font-medium'>{header}</div>
									) : (
										header(closeHandler)
									)}
								</motion.div>
							)}

							{/* Body */}
							{body && (
								<motion.div
									{...bodyProps}
									className={cn(bodyProps?.className, 'flex-1 overflow-y-auto')}
									variants={bodyVariants}
									initial='hidden'
									animate='visible'
								>
									{body(closeHandler)}
								</motion.div>
							)}

							{/* Footer */}
							{footer && (
								<motion.div
									{...footerProps}
									className={cn(footerProps?.className)}
									variants={footerVariants}
									initial='hidden'
									animate='visible'
								>
									{footer(closeHandler)}
								</motion.div>
							)}
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};
