'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { motionPresets } from '@/lib';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DonutChartTone =
	'primary' | 'info' | 'success' | 'warning' | 'secondary' | 'tertiary' | 'danger' | 'neutral';

export type DonutChartSlice = {
	id: string;
	label: string;
	value: number;
	tone: DonutChartTone;
};

export type DonutChartProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	slices: DonutChartSlice[];
	size?: 'sm' | 'md' | 'lg';
	activeId?: string | null;
	onActiveChange?: (id: string | null) => void;
	/** Centre content — usually the total plus a short caption. */
	children?: React.ReactNode;
};

// ─── Geometry ───────────────────────────────────────────────────────────────

const VIEWBOX = 100;
const CENTER = VIEWBOX / 2;
const RADIUS = 40;
const MIN_FRACTION = 0.004; // keeps a sub-percent slice visible instead of collapsing it to nothing
const GAP = 0.008; // normalized arc removed between neighbours so adjacent tones never bleed together

// ─── Component ──────────────────────────────────────────────────────────────

export const DonutChart: React.FC<DonutChartProps> = ({
	boxProps,
	//
	slices,
	size = 'md',
	activeId = null,
	onActiveChange,
	children,
}) => {
	const reduceMotion = useReducedMotion();

	// ─── Computed ─────────────────────────────────────────────────────────────

	const sizeMap: Record<NonNullable<DonutChartProps['size']>, { box: string; stroke: number }> = {
		sm: { box: 'size-32', stroke: 14 },
		md: { box: 'size-40', stroke: 15 },
		lg: { box: 'size-48', stroke: 16 },
	};

	const toneMap: Record<DonutChartTone, string> = {
		primary: 'stroke-primary',
		info: 'stroke-info',
		success: 'stroke-success',
		warning: 'stroke-warning',
		secondary: 'stroke-secondary',
		tertiary: 'stroke-tertiary',
		danger: 'stroke-danger',
		neutral: 'stroke-divider',
	};

	const dims = sizeMap[size];
	const total = slices.reduce((sum, slice) => sum + Math.max(slice.value, 0), 0);
	const hasGaps = slices.length > 1;

	// Arcs are laid out as normalized dash segments: `pathLength` is the slice share and
	// `pathOffset` its cumulative start, so every slice reuses one full circle path.
	let cursor = 0;
	const arcs = slices.map((slice, index) => {
		const fraction = total > 0 ? Math.max(Math.max(slice.value, 0) / total, MIN_FRACTION) : 0;
		const offset = cursor;
		cursor += fraction;

		// The gap is carved out of the drawn length while the cursor still advances by the true
		// share, so separators never distort the proportions they sit between.
		const drawn = hasGaps && fraction > GAP * 2 ? fraction - GAP : fraction;

		return { slice, fraction, drawn, offset, delay: index * 0.07 };
	});

	const summary = slices
		.map(
			(slice) =>
				`${slice.label}: ${slice.value.toLocaleString('fa-IR')}` +
				(total > 0 ? ` (${Math.round((slice.value / total) * 100).toLocaleString('fa-IR')}٪)` : ''),
		)
		.join('، ');

	// ─── Handlers ─────────────────────────────────────────────────────────────

	const activateHandler = (id: string | null) => {
		if (!onActiveChange) return;
		onActiveChange(id);
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div
			{...boxProps}
			className={cn('relative shrink-0', dims.box, boxProps?.className)}
			onMouseLeave={() => activateHandler(null)}
		>
			<svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} role='img' aria-label={summary} className='size-full -rotate-90'>
				<circle
					cx={CENTER}
					cy={CENTER}
					r={RADIUS}
					fill='none'
					strokeWidth={dims.stroke}
					className='stroke-surface-tertiary'
				/>

				{arcs.map(({ slice, drawn, offset, delay }) => {
					const isActive = activeId === slice.id;
					const isDimmed = !!activeId && !isActive;

					return (
						<motion.circle
							key={slice.id}
							cx={CENTER}
							cy={CENTER}
							r={RADIUS}
							fill='none'
							strokeLinecap='butt'
							initial={
								reduceMotion ? false : { pathLength: 0, pathOffset: offset, opacity: 0, strokeWidth: dims.stroke }
							}
							animate={{
								pathLength: drawn,
								pathOffset: offset,
								opacity: isDimmed ? 0.3 : 1,
								strokeWidth: isActive ? dims.stroke + 4 : dims.stroke,
							}}
							transition={{
								pathLength: { duration: motionPresets.DURATION.slower, ease: motionPresets.EASE, delay },
								default: { duration: motionPresets.DURATION.fast, ease: motionPresets.EASE },
							}}
							onMouseEnter={() => activateHandler(slice.id)}
							className={cn('cursor-default', toneMap[slice.tone])}
						/>
					);
				})}
			</svg>

			{children && (
				<div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[18%] text-center'>
					{children}
				</div>
			)}
		</div>
	);
};
