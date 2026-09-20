import { ArrowRight, ChevronLeft } from 'lucide-react';

import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type BreadcrumbPath = {
	name: string;
	onClick?: () => void;
};

export type PrimaryBreadcrumbProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	paths: BreadcrumbPath[];
	onBack?: () => void;
	backTitle?: string;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const PrimaryBreadcrumb: React.FC<PrimaryBreadcrumbProps> = ({
	boxProps,
	//
	paths = [],
	onBack,
	backTitle = 'بازگشت',
}) => {
	// ─── Computed ─────────────────────────────────────────────────────────────

	const lastIndex = paths.length - 1;

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div {...boxProps} className={cn('flex items-center gap-3', boxProps?.className)}>
			{/*----- Leading accent / back -----*/}
			{onBack ? (
				<button
					type='button'
					onClick={onBack}
					title={backTitle}
					aria-label={backTitle}
					className='group flex size-9 shrink-0 items-center justify-center rounded-xl border border-divider/60 bg-surface-secondary text-text-secondary transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-95'
				>
					<ArrowRight size={18} strokeWidth={2} className='transition-transform group-hover:translate-x-0.5' />
				</button>
			) : (
				<span className='h-7 w-1.5 shrink-0 rounded-full bg-linear-to-b from-primary to-primary/40' />
			)}

			{/*----- Trail -----*/}
			<nav className='flex min-w-0 items-center gap-1.5'>
				{paths.map((path, i) => {
					const isLast = i === lastIndex;
					const clickable = !isLast && !!path.onClick;

					return (
						<div key={`${path.name}-${i}`} className='flex min-w-0 items-center gap-1.5'>
							{isLast ? (
								<h2 className='truncate text-lg font-bold text-text-primary md:text-xl'>{path.name}</h2>
							) : (
								<button
									type='button'
									onClick={path.onClick}
									disabled={!clickable}
									className={cn(
										'truncate text-sm font-medium text-text-tertiary transition-colors',
										clickable ? 'cursor-pointer hover:text-primary' : 'cursor-default',
									)}
								>
									{path.name}
								</button>
							)}
							{!isLast && <ChevronLeft size={16} className='shrink-0 text-text-tertiary/60' />}
						</div>
					);
				})}
			</nav>
		</div>
	);
};
