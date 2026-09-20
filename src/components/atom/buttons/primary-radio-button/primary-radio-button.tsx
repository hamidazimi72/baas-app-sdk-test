import { cn } from '@/lib/utils';

type ListItem = { name: string; value: string; [key: string]: any };

export type PrimaryRadioButtonProps = {
	boxProps?: React.ComponentProps<'div'>;

	bgColor?: string;
	activeBgColor?: string;
	borderColor?: string;
	labelClass?: string;
	list?: ListItem[];
	value?: any;
	onChange?: ((item: ListItem) => void) | null;
	readOnly?: boolean;
	isVertical?: boolean;
};

export const PrimaryRadioButton: React.FC<PrimaryRadioButtonProps> = ({
	boxProps,

	bgColor = 'bg-surface-primary',
	activeBgColor = 'bg-primary',
	borderColor = 'border-primary',

	labelClass = '',
	value = '',
	list = [],
	onChange = null,
	readOnly = false,
	isVertical = false,
}) => {
	const changeHandle = (item: ListItem) => {
		if (!onChange || readOnly) return;
		onChange(item);
	};

	// return jsx
	return (
		<div {...boxProps} className={cn(boxProps?.className)}>
			<div className={cn('flex flex-wrap w-full gap-2', isVertical ? 'flex-col' : 'items-center')}>
				{list.map((item, i) => (
					<div key={i} className='cursor-pointer flex items-center gap-2 group' onClick={() => changeHandle(item)}>
						<span
							className={cn(
								'rounded-full w-5 h-5 border-2 flex items-center justify-center transition-transform duration-200 ease-premium group-active:scale-90',
								borderColor,
								bgColor,
							)}
						>
							<span
								className={cn(
									'h-3 w-3 rounded-full transition-transform duration-200 ease-bounce',
									value === item.value ? cn(activeBgColor, 'scale-100') : 'scale-0',
								)}
							></span>
						</span>
						<span className={labelClass}>{item.name || ''}</span>
					</div>
				))}
			</div>
		</div>
	);
};
