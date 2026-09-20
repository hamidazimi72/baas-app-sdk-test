'use client';

import { motion } from 'framer-motion';

import { motionPresets } from '@/lib';
import { cn } from '@/lib/utils';

export type PrimaryToggleButtonProps = {
	boxProps?: React.ComponentProps<'div'>;
	elClass?: string;
	activeBgColor?: string;
	activeBgColor2?: string;
	deactiveBgColor?: string;
	deactiveBgColor2?: string;
	value?: boolean | 'N' | 'Y' | '';
	onChange?: ((value: boolean | 'Y' | 'N') => void) | null;
	readOnly?: boolean;
};

export const PrimaryToggleButton: React.FC<PrimaryToggleButtonProps> = ({
	// box control
	boxProps,

	elClass = '',
	activeBgColor = 'bg-primary',
	activeBgColor2 = 'bg-secondary',
	deactiveBgColor = 'bg-primary',
	deactiveBgColor2 = 'bg-secondary',

	value = '',
	onChange = null,
	readOnly = false,
}) => {
	const isActive = !(!value || value === 'N');

	const changeHandle = () => {
		if (!onChange || readOnly) return;
		const forrmattedValue = (value === 'N' && 'Y') || (value === 'Y' && 'N') || (!value && true) || false;
		onChange(forrmattedValue);
	};

	// return jsx
	return (
		<div {...boxProps} className={cn(boxProps?.className)}>
			<div className='flex items-center justify-center'>
				<span
					className={cn(
						elClass,
						isActive ? activeBgColor : deactiveBgColor,
						'relative flex items-center w-full h-5 rounded-xl select-none transition-colors duration-200 ease-premium cursor-pointer',
						isActive ? 'justify-end' : 'justify-start',
					)}
					onClick={changeHandle}
				>
					<motion.span
						layout
						transition={motionPresets.SPRING}
						className={cn(
							isActive ? activeBgColor2 : deactiveBgColor2,
							'w-7 h-7 rounded-full shrink-0 will-change-transform transition-colors duration-200 ease-premium',
						)}
					/>
				</span>
			</div>
		</div>
	);
};
