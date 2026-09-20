'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { HTMLMotionProps } from 'framer-motion';
import { motion, AnimatePresence } from 'framer-motion';

import { motionPresets } from '@/lib';
import { cn } from '@/lib/utils';

// Elements that can receive keyboard focus — used to keep Tab/Shift+Tab inside the dialog.
const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type PrimaryModalProps = {
	boxProps?: React.ComponentProps<'div'>;

	onClose?: () => void;
	onCloseDisabled?: boolean;
	hideCloseIcon?: boolean;
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full' | 'auto';
	placement?: 'top' | 'center' | 'bottom';
	backdrop?: 'transparent' | 'opaque' | 'blur';
	backdropDisable?: boolean;

	contentProps?: HTMLMotionProps<'div'>;
	header?: string | ((onClose: () => void) => React.ReactNode);
	headerProps?: React.ComponentProps<'div'>;
	body?: (onClose: () => void) => React.ReactNode;
	bodyProps?: HTMLMotionProps<'div'>;
	footer?: (onClose: () => void) => React.ReactNode;
	footerProps?: HTMLMotionProps<'div'>;
};

export const PrimaryModal: React.FC<PrimaryModalProps> = ({
	boxProps,

	onClose,
	onCloseDisabled,
	hideCloseIcon,
	size = '4xl',
	placement = 'center',
	backdrop = 'blur',
	backdropDisable = false,

	contentProps,
	header,
	headerProps,
	body,
	bodyProps,
	footer,
	footerProps,
}) => {
	const [isVisible, setIsVisible] = useState(false);
	const contentRef = useRef<HTMLDivElement>(null);
	const previouslyFocused = useRef<HTMLElement | null>(null);
	const headerId = useId();
	const labelledBy = header && typeof header === 'string' ? headerId : undefined;

	useEffect(() => {
		const timer = requestAnimationFrame(() => setIsVisible(true));

		// Remember the trigger so focus can be restored on close (accessibility).
		previouslyFocused.current = document.activeElement as HTMLElement | null;
		// Move focus into the dialog once it mounts (first focusable, else the container).
		const focusTimer = requestAnimationFrame(() => {
			const node = contentRef.current;
			if (!node) return;
			const first = node.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
			(first ?? node).focus();
		});

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && !backdropDisable && !onCloseDisabled) {
				closeHandler();
			}
		};

		document.addEventListener('keydown', handleEscape);
		document.body.style.overflow = 'hidden';

		return () => {
			cancelAnimationFrame(timer);
			cancelAnimationFrame(focusTimer);
			document.removeEventListener('keydown', handleEscape);
			document.body.style.overflow = '';
			// Restore focus to whatever was focused before the dialog opened.
			previouslyFocused.current?.focus?.();
		};
	}, [backdropDisable, onCloseDisabled]);

	// Keep Tab/Shift+Tab cycling within the dialog (focus trap).
	const trapFocusHandler = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key !== 'Tab') return;
		const node = contentRef.current;
		if (!node) return;
		const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
		if (focusable.length === 0) {
			e.preventDefault();
			return;
		}
		const first = focusable[0]!;
		const last = focusable[focusable.length - 1]!;
		const active = document.activeElement as HTMLElement | null;
		if (e.shiftKey && (active === first || active === node)) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && active === last) {
			e.preventDefault();
			first.focus();
		}
	};

	const closeHandler = () => {
		if (onCloseDisabled) return;

		setIsVisible(false);

		setTimeout(() => {
			onClose?.();
		}, 350);
	};

	const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (backdropDisable || e.target !== e.currentTarget) return;
		closeHandler();
	};

	//----------* ClassNames *----------//
	const sizeClassName =
		(size === 'xs' && 'w-xs') ||
		(size === 'sm' && 'w-sm') ||
		(size === 'md' && 'w-md') ||
		(size === 'lg' && 'w-lg') ||
		(size === 'xl' && 'w-xl') ||
		(size === '2xl' && 'w-2xl') ||
		(size === '3xl' && 'w-3xl') ||
		(size === '4xl' && 'w-4xl') ||
		(size === '5xl' && 'w-5xl') ||
		(size === 'full' && 'w-full h-dvh') ||
		(size === 'auto' && 'w-auto') ||
		'w-md';

	const maxSizeClassName =
		size === 'full' ? '' : size === 'auto' ? 'max-w-[95vw] max-h-[90dvh]' : 'max-w-[90vw] max-h-[90dvh]';

	const roundedClassName = size === 'full' ? '' : 'rounded-lg';

	const placementClassName =
		(placement === 'top' && 'items-start pt-[5dvh]') ||
		(placement === 'center' && 'items-center') ||
		(placement === 'bottom' && 'items-end pb-[5dvh]') ||
		'items-center';

	const backdropClassName =
		(backdrop === 'transparent' && 'bg-transparent') ||
		(backdrop === 'opaque' && 'bg-divider/80') ||
		(backdrop === 'blur' && 'bg-divider/60 backdrop-blur-xs backdrop-brightness-50') ||
		'bg-divider/80';

	//----------* Animation Variants *----------//
	const backdropVariants = {
		hidden: { opacity: 0 },
		visible: { opacity: 1 },
		exit: { opacity: 0 },
	};

	const contentVariants = {
		hidden:
			placement === 'top'
				? { opacity: 0, scale: 0.9, y: -60, rotateX: 10 }
				: placement === 'bottom'
					? { opacity: 0, scale: 0.9, y: 60, rotateX: -10 }
					: { opacity: 0, scale: 0.85, y: 40 },
		visible: {
			opacity: 1,
			scale: 1,
			y: 0,
			rotateX: 0,
		},
		exit:
			placement === 'top'
				? { opacity: 0, scale: 0.9, y: -40, rotateX: 10 }
				: placement === 'bottom'
					? { opacity: 0, scale: 0.9, y: 40, rotateX: -10 }
					: { opacity: 0, scale: 0.85, y: 40 },
	};

	const bodyVariants = {
		hidden: { opacity: 0 },
		visible: { opacity: 1, transition: { delay: 0.15, duration: 0.3 } },
	};

	const footerVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: { opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.4 } },
	};

	return (
		<div {...boxProps} className={cn(boxProps?.className)}>
			<AnimatePresence mode='wait'>
				{isVisible && (
					<motion.div
						className={cn(
							backdropClassName,
							placementClassName,
							'fixed inset-0 z-50 flex justify-center',
							size === 'full' ? '' : 'p-4',
						)}
						variants={backdropVariants}
						initial='hidden'
						animate='visible'
						exit='exit'
						transition={{ duration: motionPresets.DURATION.base, ease: motionPresets.EASE_IN_OUT }}
						onClick={handleBackdropClick}
					>
						<motion.div
							{...contentProps}
							ref={contentRef}
							role='dialog'
							aria-modal='true'
							aria-labelledby={labelledBy}
							tabIndex={-1}
							onKeyDown={trapFocusHandler}
							className={cn(
								contentProps?.className,
								sizeClassName,
								maxSizeClassName,
								roundedClassName,
								'bg-surface-primary border border-divider/20 shadow-2xl relative flex flex-col outline-none',
								size === 'full' ? '' : 'overflow-hidden',
							)}
							variants={contentVariants}
							initial='hidden'
							animate='visible'
							exit='exit'
							transition={{
								duration: 0.35,
								ease: motionPresets.EASE_BACK,
							}}
							onClick={(e) => e.stopPropagation()}
						>
							{/* Close Button */}
							{!hideCloseIcon && (
								<motion.button
									disabled={onCloseDisabled}
									onClick={closeHandler}
									className='
										absolute left-4 top-4 z-10 flex size-10 cursor-pointer items-center justify-center
										rounded-xl border border-divider/40 bg-surface-primary text-text-secondary transition-colors duration-200
										hover:border-danger/40 hover:text-danger
										disabled:cursor-not-allowed disabled:opacity-50
										focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
									'
									aria-label='بستن'
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									transition={{ duration: 0.2 }}
								>
									<X size={20} strokeWidth={2} />
								</motion.button>
							)}

							{/* Header */}
							{header && (
								<div
									{...headerProps}
									className={cn(
										headerProps?.className,
										typeof header === 'string' &&
											'flex min-h-16 w-full items-center border-b border-divider/30 px-5 pe-16 py-4',
									)}
								>
									{typeof header === 'string' ? (
										<div id={headerId} className='w-full text-start text-lg font-bold text-text-primary'>
											{header}
										</div>
									) : (
										header(closeHandler)
									)}
								</div>
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
