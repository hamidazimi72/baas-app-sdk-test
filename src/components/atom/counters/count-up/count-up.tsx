'use client';

import { useEffect, useRef, useState } from 'react';

import { useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CountUpProps = {
	boxProps?: React.ComponentProps<'span'>;
	//
	value: number;
	duration?: number;
	/** delay before the count starts (sec) — sync with an entrance stagger */
	delay?: number;
	/** Intl locale used to format the running value */
	locale?: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

// premium ease-out so the counter decelerates into its final value
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// ─── Component ──────────────────────────────────────────────────────────────

export const CountUp: React.FC<CountUpProps> = ({
	boxProps,
	//
	value,
	duration = 1.2,
	delay = 0,
	locale = 'fa-IR',
}) => {
	const reduceMotion = useReducedMotion();
	const [display, setDisplay] = useState(reduceMotion ? value : 0);
	const frameRef = useRef<number | null>(null);

	// ─── Computed ─────────────────────────────────────────────────────────────

	const format = (n: number) => Math.round(n).toLocaleString(locale);

	// ─── Effects ──────────────────────────────────────────────────────────────

	useEffect(() => {
		if (reduceMotion) {
			setDisplay(value);
			return;
		}

		let start: number | null = null;
		const durationMs = duration * 1000;
		const delayMs = delay * 1000;

		const tick = (now: number) => {
			if (start === null) start = now;
			const elapsed = now - start - delayMs;

			if (elapsed < 0) {
				frameRef.current = requestAnimationFrame(tick);
				return;
			}

			const progress = Math.min(elapsed / durationMs, 1);
			setDisplay(value * easeOut(progress));

			if (progress < 1) frameRef.current = requestAnimationFrame(tick);
			else setDisplay(value);
		};

		frameRef.current = requestAnimationFrame(tick);
		return () => {
			if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
		};
	}, [value, duration, delay, reduceMotion]);

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<span {...boxProps} className={cn('tabular-nums', boxProps?.className)}>
			{format(display)}
		</span>
	);
};
