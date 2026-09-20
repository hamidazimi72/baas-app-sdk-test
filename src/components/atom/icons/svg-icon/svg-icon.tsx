import { cn } from '@/lib/utils';

import * as icons from './icons';

export const SVGIcons_icons = icons;

export type SVGIcons = keyof typeof icons;

export type SVGIconProps = {
	boxProps?: React.ComponentProps<'div'>;
	elProps?: React.ComponentProps<'div'>;

	textColor?: string;
	height?: string;
	width?: string;

	icon?: SVGIcons;
};

export const SVGIcon: React.FC<SVGIconProps> = ({
	// box Control
	boxProps,
	elProps,

	textColor = 'text-inherit',
	height = '',
	width = 'w-5',

	icon,
}) => {
	return (
		<div {...boxProps} className={cn(boxProps?.className)}>
			{' '}
			<div
				{...elProps}
				className={cn(elProps?.className, textColor, height, width)}
				dangerouslySetInnerHTML={{
					__html: icons?.[icon || ''] || '',
				}}
			/>
		</div>
	);
};
