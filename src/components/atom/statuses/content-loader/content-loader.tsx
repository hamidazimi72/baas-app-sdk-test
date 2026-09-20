'use client';

import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { motionPresets } from '@/lib';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ContentLoaderProps = React.ComponentProps<'div'> & {
	loading?: boolean;
	label?: string;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const ContentLoader: React.FC<ContentLoaderProps> = ({
	children,
	//
	loading = false,
	label = 'در حال پردازش...',
	className,
	...boxProps
}) => {
	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div {...boxProps} className={cn('relative', className)}>
			<div
				aria-busy={loading}
				className={cn(
					'transition-all duration-300',
					loading && 'pointer-events-none select-none opacity-60 blur-[1px]',
				)}
			>
				{children}
			</div>

			<AnimatePresence>
				{loading && (
					<motion.div
						className='absolute inset-0 z-10 flex cursor-not-allowed flex-col items-center justify-center gap-3 rounded-xl backdrop-blur-[2px]'
						variants={motionPresets.fade()}
						initial='hidden'
						animate='visible'
						exit='hidden'
					>
						<span className='relative flex size-11 items-center justify-center'>
							<span className='absolute inset-0 animate-ping rounded-full bg-primary/15' />
							<span className='absolute inset-0 rounded-full border border-primary/20' />
							<motion.span
								className='flex size-11 items-center justify-center'
								animate={{ rotate: 360 }}
								transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
							>
								<Loader2 className='size-6 text-primary' strokeWidth={2.25} />
							</motion.span>
						</span>
						<span className='text-xs font-medium text-text-secondary'>{label}</span>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};
