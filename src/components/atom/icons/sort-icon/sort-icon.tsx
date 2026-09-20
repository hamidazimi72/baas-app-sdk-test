import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';

import { cn } from '@/lib/utils';

export type SortIconProps = {
	children?: React.ReactNode;
	boxProps?: React.ComponentProps<'div'>;

	value?: string;
	ascName?: string;
	descName?: string;
	onChange?: ((value?: string) => any) | null;
	class_icon?: string;
};

export const SortIcon: React.FC<SortIconProps> = ({
	children,
	// box Control
	boxProps,

	value = '',
	ascName = '',
	descName = '',
	onChange = null,

	class_icon = 'ml-2',
}) => {
	const SortIcon =
		(value && value === ascName && ChevronUp) || (value && value === descName && ChevronDown) || ChevronsUpDown;

	const sortAction = () => {
		if (!onChange) return;
		if ((!value || (value !== ascName && value !== descName)) && ascName) onChange(ascName);
		else if (!value && descName) onChange(descName);
		else if (value === ascName && descName) onChange(descName);
		else if (value === ascName && !descName) onChange('');
		else if (value === descName) onChange('');
	};

	return (
		<div {...boxProps} className={cn(boxProps?.className, 'cursor-pointer select-none')} onClick={sortAction}>
			<SortIcon size={18} strokeWidth='1.5px' className={cn(class_icon)} onClick={() => onChange && sortAction()} />
			{children}
		</div>
	);
};
