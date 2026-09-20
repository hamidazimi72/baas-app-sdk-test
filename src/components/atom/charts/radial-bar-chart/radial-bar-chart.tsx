'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { motionPresets } from '@/lib';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type RadialBarChartTone =
	'primary' | 'info' | 'success' | 'warning' | 'secondary' | 'tertiary' | 'danger' | 'neutral';

export type RadialBarChartArc = {
	id: string;
	label: string;
	value: number;
	tone?: RadialBarChartTone;
};

export type RadialBarChartProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	arcs: RadialBarChartArc[];
	/**
	 * Reference value for a full sweep. Defaults to the largest arc, so the leading band closes its
	 * ring and every other band reads as a direct fraction of it.
	 */
	max?: number;
	tone?: RadialBarChartTone;
	size?: 'sm' | 'md' | 'lg';
	/** Fade each band by its position so an ordinal series stays ordered without extra hues. */
	ramp?: boolean;
	activeId?: string | null;
	onActiveChange?: (id: string | null) => void;
	/** Centre content — usually the total plus a short caption. */
	children?: React.ReactNode;
};

// ─── Geometry ───────────────────────────────────────────────────────────────

const VIEWBOX = 100;
const CENTER = VIEWBOX / 2;
const RADIUS_OUTER = 46;
const RADIUS_INNER = 17;
// Bands sweep three quarters of the circle so start and end are always distinguishable — a band
// that closed a full ring would read as "empty" exactly like one that never started.
const SWEEP = 0.75;
const MIN_FRACTION = 0.03; // keeps a non-zero band from collapsing under its own round cap
const BAND_FILL = 0.62; // share of each band occupied by the stroke; the remainder is breathing room

// Position-driven intensity: only the semantic tone is ever used as a colour, so an ordinal series
// longer than the distinct token hues stays ordered through weight instead of inventing new ones.
const RAMP = [1, 0.85, 0.72, 0.62, 0.54, 0.48, 0.44, 0.41];
const RAMP_FLOOR = 0.38;

/**
 * Fill weight for the band at `index`. Exported so a consumer-owned legend can tint its swatches
 * with the exact same ramp — a legend keyed to different colours than the chart is worse than none.
 */
export const getRadialBarIntensity = (index: number): number => RAMP[index] ?? RAMP_FLOOR;

// ─── Component ──────────────────────────────────────────────────────────────

export const RadialBarChart: React.FC<RadialBarChartProps> = ({
	boxProps,
	//
	arcs,
	max,
	tone = 'primary',
	size = 'md',
	ramp = true,
	activeId = null,
	onActiveChange,
	children,
}) => {
	const reduceMotion = useReducedMotion();

	// ─── Computed ─────────────────────────────────────────────────────────────

	const sizeMap: Record<NonNullable<RadialBarChartProps['size']>, string> = {
		sm: 'size-36',
		md: 'size-44',
		lg: 'size-52',
	};

	const toneMap: Record<RadialBarChartTone, string> = {
		primary: 'stroke-primary',
		info: 'stroke-info',
		success: 'stroke-success',
		warning: 'stroke-warning',
		secondary: 'stroke-secondary',
		tertiary: 'stroke-tertiary',
		danger: 'stroke-danger',
		neutral: 'stroke-divider',
	};

	const total = arcs.reduce((sum, arc) => sum + Math.max(arc.value, 0), 0);
	const scale = Math.max(max ?? 0, ...arcs.map((arc) => Math.max(arc.value, 0)), 1);
	const band = arcs.length > 0 ? (RADIUS_OUTER - RADIUS_INNER) / arcs.length : 0;
	const stroke = Math.max(band * BAND_FILL, 2);

	const bands = arcs.map((arc, index) => {
		const ratio = Math.max(arc.value, 0) / scale;
		const fraction = ratio > 0 ? Math.max(ratio, MIN_FRACTION) * SWEEP : 0;

		return {
			arc,
			fraction,
			radius: RADIUS_OUTER - band * (index + 0.5),
			intensity: ramp ? getRadialBarIntensity(index) : 1,
			delay: index * 0.06,
		};
	});

	const summary = arcs
		.map(
			(arc) =>
				`${arc.label}: ${arc.value.toLocaleString('fa-IR')}` +
				(total > 0 ? ` (${Math.round((arc.value / total) * 100).toLocaleString('fa-IR')}٪)` : ''),
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
			className={cn('relative shrink-0', sizeMap[size], boxProps?.className)}
			onMouseLeave={() => activateHandler(null)}
		>
			<svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} role='img' aria-label={summary} className='size-full -rotate-90'>
				{bands.map(({ arc, radius }) => (
					<circle
						key={`${arc.id}-track`}
						cx={CENTER}
						cy={CENTER}
						r={radius}
						fill='none'
						strokeWidth={stroke}
						strokeLinecap='round'
						pathLength={1}
						strokeDasharray={`${SWEEP} 1`}
						className='stroke-surface-tertiary'
					/>
				))}

				{bands.map(({ arc, fraction, radius, intensity, delay }) => {
					const isActive = activeId === arc.id;
					const isDimmed = !!activeId && !isActive;

					return (
						<motion.circle
							key={arc.id}
							cx={CENTER}
							cy={CENTER}
							r={radius}
							fill='none'
							strokeLinecap='round'
							initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
							animate={{
								pathLength: fraction,
								opacity: isDimmed ? intensity * 0.35 : isActive ? 1 : intensity,
								strokeWidth: isActive ? stroke + 1.5 : stroke,
							}}
							transition={{
								pathLength: { duration: motionPresets.DURATION.slower, ease: motionPresets.EASE, delay },
								default: { duration: motionPresets.DURATION.fast, ease: motionPresets.EASE },
							}}
							onMouseEnter={() => activateHandler(arc.id)}
							className={cn('cursor-default', toneMap[arc.tone ?? tone])}
						/>
					);
				})}
			</svg>

			{children && (
				<div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[28%] text-center'>
					{children}
				</div>
			)}
		</div>
	);
};
