'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PrimaryTooltipProps = {
	boxProps?: React.ComponentProps<'div'>;
	content?: string | React.ReactNode | ((onClose: () => void) => React.ReactNode);
	children?: React.ReactNode;
	delayDuration?: number;
	side?: 'top' | 'right' | 'bottom' | 'left';
	align?: 'start' | 'center' | 'end';
	contentProps?: React.ComponentProps<'div'>;
	arrow?: boolean;
};

type Coords = { left: number; top: number; transform: string };

// ─── Position ─────────────────────────────────────────────────────────────────

const GAP = 8;

// Fixed-position coords are anchored to the trigger's viewport rect; the portal
// keeps the tooltip out of any scroll container so it can't inflate scrollWidth.
const computeCoords = (
	rect: DOMRect,
	side: NonNullable<PrimaryTooltipProps['side']>,
	align: NonNullable<PrimaryTooltipProps['align']>,
): Coords => {
	const xByAlign = {
		start: { value: rect.left, t: '0' },
		center: { value: rect.left + rect.width / 2, t: '-50%' },
		end: { value: rect.right, t: '-100%' },
	} as const;

	const yByAlign = {
		start: { value: rect.top, t: '0' },
		center: { value: rect.top + rect.height / 2, t: '-50%' },
		end: { value: rect.bottom, t: '-100%' },
	} as const;

	switch (side) {
		case 'bottom': {
			const x = xByAlign[align];
			return { left: x.value, top: rect.bottom + GAP, transform: `translate(${x.t}, 0)` };
		}
		case 'left': {
			const y = yByAlign[align];
			return { left: rect.left - GAP, top: y.value, transform: `translate(-100%, ${y.t})` };
		}
		case 'right': {
			const y = yByAlign[align];
			return { left: rect.right + GAP, top: y.value, transform: `translate(0, ${y.t})` };
		}
		case 'top':
		default: {
			const x = xByAlign[align];
			return { left: x.value, top: rect.top - GAP, transform: `translate(${x.t}, -100%)` };
		}
	}
};

const getArrowClasses = (side: NonNullable<PrimaryTooltipProps['side']>): string => {
	const map: Record<string, string> = {
		top: 'top-full left-1/2 -translate-x-1/2 border-l border-b -mt-1 rotate-135',
		bottom: 'bottom-full left-1/2 -translate-x-1/2 border-r border-t -mb-1',
		left: 'left-full top-1/2 -translate-y-1/2 border-r border-t -ml-1',
		right: 'right-full top-1/2 -translate-y-1/2 border-l border-b -mr-1',
	};
	return map?.[side] ?? map.top ?? '';
};

// ─── Component ────────────────────────────────────────────────────────────────

export const PrimaryTooltip: React.FC<PrimaryTooltipProps> = ({
	boxProps,
	content,
	children,
	delayDuration = 300,
	side = 'top',
	align = 'center',
	contentProps,
	arrow = true,
}) => {
	const [open, setOpen] = useState(false);
	const [visible, setVisible] = useState(false);
	const [coords, setCoords] = useState<Coords | null>(null);

	const triggerRef = useRef<HTMLDivElement>(null);
	const showTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	// ─── Handlers ─────────────────────────────────────────────────────────────

	const updateCoords = useCallback(() => {
		const rect = triggerRef.current?.getBoundingClientRect();
		if (rect) setCoords(computeCoords(rect, side, align));
	}, [side, align]);

	const closeHandler = useCallback(() => {
		clearTimeout(showTimerRef.current);
		clearTimeout(hideTimerRef.current);
		setVisible(false);
		setOpen(false);
	}, []);

	const mouseEnterHandler = useCallback(() => {
		clearTimeout(hideTimerRef.current);
		showTimerRef.current = setTimeout(() => {
			updateCoords();
			setOpen(true);
		}, delayDuration);
	}, [delayDuration, updateCoords]);

	const mouseLeaveHandler = useCallback(() => {
		clearTimeout(showTimerRef.current);
		setVisible(false);
		hideTimerRef.current = setTimeout(() => setOpen(false), 200);
	}, []);

	// ─── Effects ──────────────────────────────────────────────────────────────

	// Fade in on the frame after mount; keep the tooltip pinned to the trigger
	// while it scrolls/resizes under the viewport.
	useEffect(() => {
		if (!open) return;

		const raf = requestAnimationFrame(() => setVisible(true));
		const onReflow = () => updateCoords();

		window.addEventListener('scroll', onReflow, { passive: true, capture: true });
		window.addEventListener('resize', onReflow, { passive: true });
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('scroll', onReflow, { capture: true });
			window.removeEventListener('resize', onReflow);
		};
	}, [open, updateCoords]);

	useEffect(
		() => () => {
			clearTimeout(showTimerRef.current);
			clearTimeout(hideTimerRef.current);
		},
		[],
	);

	// ─── Render ───────────────────────────────────────────────────────────────

	if (!content) {
		return (
			<div {...boxProps} className={boxProps?.className}>
				{children}
			</div>
		);
	}

	const animationClass = visible ? 'opacity-100' : 'opacity-0 pointer-events-none';

	return (
		<div
			{...boxProps}
			ref={triggerRef}
			className={cn('relative inline-block', boxProps?.className)}
			onMouseEnter={mouseEnterHandler}
			onMouseLeave={mouseLeaveHandler}
		>
			{children}

			{open &&
				coords &&
				typeof document !== 'undefined' &&
				createPortal(
					<div
						{...contentProps}
						role='tooltip'
						style={{
							position: 'fixed',
							left: coords.left,
							top: coords.top,
							transform: `${coords.transform} scale(${visible ? 1 : 0.95})`,
						}}
						className={cn(
							'z-9999 w-max max-w-xs px-3 py-2 text-sm',
							'bg-surface-secondary text-text-primary border border-divider/30 rounded-md',
							'transition-all duration-200 ease-premium',
							animationClass,
							contentProps?.className,
						)}
						onMouseEnter={() => clearTimeout(hideTimerRef.current)}
						onMouseLeave={mouseLeaveHandler}
					>
						{arrow && (
							<div
								className={cn(
									'absolute w-2 h-2 rotate-45 bg-surface-secondary border-divider/30',
									getArrowClasses(side),
								)}
							/>
						)}

						<div className='relative z-10'>
							{typeof content === 'string' ? (
								<span>{content}</span>
							) : typeof content === 'function' ? (
								content(closeHandler)
							) : (
								content
							)}
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
};
