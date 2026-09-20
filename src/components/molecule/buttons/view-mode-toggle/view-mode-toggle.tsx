'use client';

import { motion } from 'framer-motion';
import { LayoutGrid, Table } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { PrimaryTooltip } from '@/components/atom';
import { motionPresets } from '@/lib';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ViewMode = 'table' | 'card';

export type ViewModeToggleProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	value: ViewMode;
	onChange: (value: ViewMode) => void;
	disabled?: boolean;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
	boxProps,
	//
	value,
	onChange,
	disabled = false,
}) => {
	// ─── Computed ─────────────────────────────────────────────────────────────

	const options: { mode: ViewMode; icon: LucideIcon; label: string }[] = [
		{ mode: 'table', icon: Table, label: 'نمایش جدولی' },
		{ mode: 'card', icon: LayoutGrid, label: 'نمایش کارتی' },
	];

	// ─── Handlers ─────────────────────────────────────────────────────────────

	const changeHandler = (mode: ViewMode) => {
		if (disabled || mode === value) return;
		onChange(mode);
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div
			{...boxProps}
			className={cn(
				'inline-flex items-center gap-1 rounded-xl border border-divider/30 bg-surface-secondary/50 p-1',
				disabled && 'pointer-events-none opacity-60',
				boxProps?.className,
			)}
		>
			{options.map(({ mode, icon: Icon, label }) => {
				const active = value === mode;

				return (
					<PrimaryTooltip key={mode} content={label}>
						<button
							type='button'
							onClick={() => changeHandler(mode)}
							aria-label={label}
							aria-pressed={active}
							className={cn(
								'relative flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors',
								active ? 'text-text-on-brand' : 'text-text-tertiary hover:text-text-secondary',
							)}
						>
							{active && (
								<motion.span
									layoutId='view-mode-active-pill'
									transition={motionPresets.SPRING}
									className='absolute inset-0 rounded-lg bg-primary shadow-sm'
								/>
							)}
							<Icon size={16} strokeWidth={2} className='relative z-10' />
						</button>
					</PrimaryTooltip>
				);
			})}
		</div>
	);
};
