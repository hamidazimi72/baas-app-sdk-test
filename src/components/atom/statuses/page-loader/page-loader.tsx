'use client';

import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

import { motionPresets } from '@/lib';

export type PageLoaderProps = {
	boxProps?: React.ComponentProps<'div'>;
};

export const PageLoader: React.FC<PageLoaderProps> = ({ boxProps }) => {
	return (
		<div {...boxProps} className='fixed inset-0 z-50 flex items-center justify-center bg-surface-secondary'>
			<div className='relative flex flex-col items-center gap-4'>
				{/* Spinner */}
				<motion.div
					animate={{ rotate: 360 }}
					transition={{
						duration: 1,
						repeat: Infinity,
						ease: 'linear',
					}}
				>
					<Loader2 className='h-8 w-8 text-primary' />
				</motion.div>

				{/* Text */}
				<motion.p
					className='text-sm text-text-secondary'
					variants={motionPresets.fade(0.2)}
					initial='hidden'
					animate='visible'
				>
					در حال بارگذاری...
				</motion.p>
			</div>
		</div>
	);
};
