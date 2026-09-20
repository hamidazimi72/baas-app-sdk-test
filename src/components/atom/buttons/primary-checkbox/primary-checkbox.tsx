import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export type PrimaryCheckboxProps = {
	boxProps?: React.ComponentProps<'div'>;
	labelClass?: string;
	activeBgColor?: string;
	activeBorderColor?: string;
	deactiveBgColor?: string;
	deactiveBorderColor?: string;
	checkTextColor?: string;
	label?: string | null;
	value?: boolean;
	onChange?: ((value: boolean) => void) | null;
	readOnly?: boolean;
};

export const PrimaryCheckbox: React.FC<PrimaryCheckboxProps> = ({
	// box control
	boxProps,

	activeBgColor = 'bg-primary/20',
	activeBorderColor = 'border-text-primary',
	deactiveBgColor = 'bg-transparent',
	deactiveBorderColor = 'border-text-primary',
	checkTextColor = 'text-text-primary',

	label = '',
	labelClass = '',
	value = undefined,
	onChange = null,
	readOnly = false,
}) => {
	const isCheck = Boolean(value);

	const changeHandle = () => {
		if (!onChange || readOnly) return;
		const forrmattedValue = (!value && true) || false;
		onChange(forrmattedValue);
	};

	// return jsx
	return (
		<div {...boxProps} className={cn(boxProps?.className)}>
			<div className='flex w-full items-center gap-2'>
				<span
					className={cn(
						isCheck ? activeBgColor : deactiveBgColor,
						'border',
						isCheck ? activeBorderColor : deactiveBorderColor,
						!readOnly && 'cursor-pointer active:scale-90',
						'flex justify-center items-center w-6 h-6 rounded-md p-0.5 transition-[color,background-color,border-color,transform] duration-200 ease-premium',
					)}
					onClick={changeHandle}
				>
					<Check
						size={16}
						strokeWidth='2px'
						className={cn(
							'transition-all duration-200 ease-bounce',
							isCheck ? cn(checkTextColor, 'scale-100 opacity-100') : 'text-transparent scale-50 opacity-0',
						)}
					/>
				</span>
				{label && (
					<span className={cn(!readOnly && 'cursor-pointer', labelClass)} onClick={changeHandle}>
						{label}
					</span>
				)}
			</div>
		</div>
	);
};
