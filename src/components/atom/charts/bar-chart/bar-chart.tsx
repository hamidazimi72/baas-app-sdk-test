'use client';

import { motion } from 'framer-motion';

import { motionPresets } from '@/lib';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type BarChartTone = 'primary' | 'info' | 'success' | 'warning' | 'secondary' | 'tertiary' | 'danger' | 'neutral';

// Percentage floor that keeps a non-zero bar readable instead of collapsing it into the track.
const MIN_SHARE = 3;

// Rank-driven fill intensity. Only the semantic tone is ever used as a colour; rank is encoded by
// opacity so a series can exceed the five visually-distinct token hues without inventing new ones.
const RAMP = [1, 0.86, 0.74, 0.64, 0.56, 0.5, 0.46, 0.43];
const RAMP_FLOOR = 0.4;

// Leading positions that earn a tinted rank chip. Past the podium the chip stays neutral so the eye
// is not pulled toward an arbitrary tail row.
const PODIUM = 3;

export type BarChartBar = {
	id: string;
	label: React.ReactNode;
	value: number;
	tone?: BarChartTone;
	/** Trailing metric pinned to the end of the track — typically the share of the series. */
	hint?: React.ReactNode;
	/** Screen-reader sentence for the row; falls back to a label/value pair. */
	ariaLabel?: string;
};

export type BarChartProps = {
	boxProps?: React.ComponentProps<typeof motion.div>;
	//
	bars: BarChartBar[];
	/**
	 * Full-track reference value. Defaults to the largest bar so the leader fills the track and
	 * every other bar reads as a fraction of it — the ranking is then legible at a glance. Pass the
	 * series total only when the track itself must encode the share rather than the ranking.
	 */
	max?: number;
	tone?: BarChartTone;
	size?: 'sm' | 'md';
	columns?: 1 | 2;
	/** Ordinal position chip before each label. */
	showRank?: boolean;
	/** Fade the fill by rank so position is encoded twice (length + weight). */
	ramp?: boolean;
	activeId?: string | null;
	onActiveChange?: (id: string | null) => void;
	valueFormatter?: (value: number) => string;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const BarChart: React.FC<BarChartProps> = ({
	boxProps,
	//
	bars,
	max,
	tone = 'primary',
	size = 'md',
	columns = 1,
	showRank = true,
	ramp = true,
	activeId = null,
	onActiveChange,
	valueFormatter,
}) => {
	// ─── Computed ─────────────────────────────────────────────────────────────

	const toneMap: Record<BarChartTone, string> = {
		primary: 'bg-primary',
		info: 'bg-info',
		success: 'bg-success',
		warning: 'bg-warning',
		secondary: 'bg-secondary',
		tertiary: 'bg-tertiary',
		danger: 'bg-danger',
		neutral: 'bg-divider',
	};

	// The chip carries its own surface so the ordinal never competes with the label as plain text:
	// `podium` tints the leading rows, `active` inverts on hover/selection.
	const rankToneMap: Record<BarChartTone, { podium: string; active: string }> = {
		primary: { podium: 'bg-primary/10 text-primary', active: 'bg-primary text-on-primary' },
		info: { podium: 'bg-info/10 text-info', active: 'bg-info text-on-info' },
		success: { podium: 'bg-success/10 text-success', active: 'bg-success text-on-success' },
		warning: { podium: 'bg-warning/10 text-warning', active: 'bg-warning text-on-warning' },
		secondary: { podium: 'bg-secondary/10 text-secondary-active', active: 'bg-secondary text-on-secondary' },
		tertiary: { podium: 'bg-tertiary/10 text-tertiary', active: 'bg-tertiary text-on-tertiary' },
		danger: { podium: 'bg-danger/10 text-danger', active: 'bg-danger text-on-danger' },
		neutral: { podium: 'bg-divider/40 text-text-secondary', active: 'bg-divider text-text-primary' },
	};

	const sizeMap: Record<
		NonNullable<BarChartProps['size']>,
		{ track: string; label: string; value: string; hint: string; row: string; gap: string; rank: string }
	> = {
		sm: {
			track: 'h-2.5',
			label: 'text-[11px]',
			value: 'text-[11px]',
			hint: 'text-[11px]',
			row: 'py-1',
			gap: 'gap-1',
			rank: 'h-4 min-w-4 text-[9px]',
		},
		md: {
			track: 'h-3',
			label: 'text-xs',
			value: 'text-xs',
			hint: 'text-xs',
			row: 'py-1.5',
			gap: 'gap-1.5',
			rank: 'h-[18px] min-w-[18px] text-[10px]',
		},
	};

	const dims = sizeMap[size];
	const scale = Math.max(max ?? 0, ...bars.map((bar) => Math.max(bar.value, 0)), 1);
	const formatValue = valueFormatter ?? ((value: number) => value.toLocaleString('fa-IR'));
	const isInteractive = !!onActiveChange;

	// ─── Handlers ─────────────────────────────────────────────────────────────

	const activateHandler = (id: string | null) => {
		if (!onActiveChange) return;
		onActiveChange(id);
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<motion.div
			{...boxProps}
			variants={motionPresets.staggerContainer(0.05)}
			initial='hidden'
			animate='visible'
			onMouseLeave={() => activateHandler(null)}
			// `@container` on the wrapper so the two-column split reacts to the chart's own width —
			// a chart inside a narrow dashboard card must stay single-column on a wide viewport.
			className={cn('@container', boxProps?.className)}
		>
			<div className={cn('grid grid-cols-1', dims.gap, columns === 2 && '@lg:grid-cols-2 @lg:gap-x-5')}>
				{bars.map((bar, index) => {
					const ratio = Math.max(bar.value, 0) / scale;
					const share = ratio > 0 ? Math.max(ratio * 100, MIN_SHARE) : 0;
					const isActive = activeId === bar.id;
					const isDimmed = !!activeId && !isActive;
					const intensity = ramp ? (RAMP[index] ?? RAMP_FLOOR) : 1;
					const barTone = bar.tone ?? tone;
					const rowLabel = bar.ariaLabel ?? `${String(bar.label)}: ${formatValue(bar.value)}`;

					return (
						<motion.div
							key={bar.id}
							variants={motionPresets.staggerItem(motionPresets.DISTANCE.sm)}
							className={cn(
								'min-w-0 transition-opacity duration-200 motion-reduce:transition-none',
								isDimmed && 'opacity-50',
							)}
						>
							<button
								type='button'
								disabled={!isInteractive}
								aria-label={rowLabel}
								aria-pressed={isInteractive ? isActive : undefined}
								onClick={() => activateHandler(isActive ? null : bar.id)}
								onMouseEnter={() => activateHandler(bar.id)}
								onFocus={() => activateHandler(bar.id)}
								onBlur={() => activateHandler(null)}
								className={cn(
									'block w-full rounded-lg px-1.5 text-start transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 motion-reduce:transition-none',
									dims.row,
									isInteractive && 'cursor-pointer',
									isActive ? 'bg-surface-secondary' : isInteractive && 'hover:bg-surface-secondary/60',
								)}
							>
								<span className='flex items-center gap-1.5'>
									{showRank && (
										<span
											aria-hidden='true'
											className={cn(
												'inline-flex shrink-0 items-center justify-center rounded-md px-1 font-extrabold leading-none tabular-nums transition-colors duration-200 motion-reduce:transition-none',
												dims.rank,
												isActive
													? rankToneMap[barTone].active
													: index < PODIUM
														? rankToneMap[barTone].podium
														: 'bg-surface-tertiary text-text-tertiary',
											)}
										>
											{(index + 1).toLocaleString('fa-IR')}
										</span>
									)}
									<span
										className={cn(
											'min-w-0 flex-1 truncate font-medium transition-colors duration-200 motion-reduce:transition-none',
											dims.label,
											isActive ? 'text-text-primary' : 'text-text-secondary',
										)}
									>
										{bar.label}
									</span>
									<span className={cn('shrink-0 font-bold tabular-nums text-text-primary', dims.value)}>
										{formatValue(bar.value)}
									</span>
								</span>

								<span className='mt-1.5 flex items-center gap-2'>
									<span className={cn('min-w-0 flex-1 overflow-hidden rounded-full bg-surface-tertiary', dims.track)}>
										{/* Data-driven width can only be a computed value; the reveal itself stays on the GPU
										    (`scaleX` from the RTL start edge), so the track never animates layout. */}
										<motion.span
											variants={{
												hidden: { scaleX: 0 },
												visible: {
													scaleX: 1,
													transition: { duration: motionPresets.DURATION.slow, ease: motionPresets.EASE },
												},
											}}
											style={{ width: `${share}%`, opacity: isActive ? 1 : intensity }}
											className={cn(
												'block h-full origin-right rounded-full transition-opacity duration-200 motion-reduce:transition-none',
												toneMap[barTone],
											)}
										/>
									</span>

									{bar.hint && (
										<span
											className={cn(
												'w-10 shrink-0 text-end font-bold tabular-nums',
												dims.hint,
												isActive ? 'text-text-primary' : 'text-text-tertiary',
											)}
										>
											{bar.hint}
										</span>
									)}
								</span>
							</button>
						</motion.div>
					);
				})}
			</div>
		</motion.div>
	);
};
