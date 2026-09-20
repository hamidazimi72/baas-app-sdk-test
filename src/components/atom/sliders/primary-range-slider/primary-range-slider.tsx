import { cn } from '@/lib/utils';

export type PrimaryRangeSliderProps = {
	boxProps?: React.ComponentProps<'div'>;
	value?: number | string;
	min?: number;
	max?: number;
	onChange?: undefined | ((value: string | number) => any);
	hideLabel?: boolean;
	labelClass?: string;
};

export const PrimaryRangeSlider: React.FC<PrimaryRangeSliderProps> = ({
	// box Control
	boxProps,

	value = '',
	min = 0,
	max = 10000,
	onChange = undefined,

	hideLabel = false,
	labelClass = '',
}) => {
	const onChangeHandler = (e) => {
		if (onChange) onChange(e.target.value);
	};

	return (
		<div {...boxProps} className={cn(boxProps?.className)}>
			<input className='w-full h-3' type='range' value={value} min={min} max={max} onChange={onChangeHandler} />
			{!hideLabel && (
				<div className={cn(labelClass, 'flex items-center text-xs text-center')}>
					<span className='w-full text-right'>{Math.floor(min)}</span>
					<span className='w-full text-center'>{Math.floor((max - min) / 2) || ''}</span>
					<span className='w-full text-left'>{max}</span>
				</div>
			)}
		</div>
	);
};
