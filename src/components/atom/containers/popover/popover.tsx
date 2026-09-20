import React, { useEffect, useRef } from 'react';

import { FramerAnimate } from '@/components/atom';
import { cn } from '@/lib/utils';

export type PopoverProps = {
	children?: React.ReactNode;
	boxProps?: React.HTMLAttributes<HTMLDivElement>;
	placement?: 'top' | 'bottom' | 'left' | 'right';
	offset?: number; // px
	showArrow?: boolean;
	onClose?: () => void;
	className?: string;
};

export const Popover: React.FC<PopoverProps> = ({ children, boxProps, placement = 'top', onClose, className = '' }) => {
	const ref = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const onDocMouse = (e: MouseEvent | TouchEvent) => {
			const el = ref.current;
			if (!el) return;
			if (!e.target) return;
			if (el.contains(e.target as Node)) {
				onClose?.();
				return;
			}

			onClose?.();
		};

		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose?.();
		};

		document.addEventListener('mousedown', onDocMouse);
		document.addEventListener('touchstart', onDocMouse);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDocMouse);
			document.removeEventListener('touchstart', onDocMouse);
			document.removeEventListener('keydown', onKey);
		};
	}, [onClose]);

	const wrapperClass =
		(placement === 'bottom' && 'top-[calc(100%_+_4px)]') ||
		(placement === 'left' && 'left-[-12px]') ||
		(placement === 'right' && 'right-[-12px]') ||
		'bottom-[calc(100%_+_4px)]';

	return (
		<div
			{...boxProps}
			ref={ref}
			className={cn(boxProps?.className, wrapperClass, 'absolute w-full z-9999 pointer-events-auto')}
			role='dialog'
			aria-modal='false'
		>
			<FramerAnimate
				initial={{ opacity: 0, translateY: -5 }}
				animate={{ opacity: 1, translateY: 0 }}
				transition={{ duration: 0.5 }}
				disableEntryIntersecting
				onClick={() => onClose?.()}
				className={className || ''}
			>
				{children}
			</FramerAnimate>
		</div>
	);
};
