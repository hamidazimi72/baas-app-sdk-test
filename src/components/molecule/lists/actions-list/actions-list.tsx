import type { ActionIconButtonProps } from '@/components/atom';
import { ActionIconButton } from '@/components/atom';
import { cn } from '@/lib/utils';

export type ActionListItem = ActionIconButtonProps & { visible?: boolean; access?: boolean };

export type ActionsListProps = {
	boxProps?: React.ComponentProps<'div'>;
	list?: ActionListItem[];
};

export const ActionsList: React.FC<ActionsListProps> = ({
	boxProps,
	list = [],

	...props
}) => {
	return (
		<div {...props} {...boxProps} className={cn('flex flex-wrap items-center justify-end gap-1', boxProps?.className)}>
			{list.map((item, i) => {
				if ('visible' in item && !item.visible) return null;
				if ('access' in item && !item.access) return null;
				return <ActionIconButton key={i} {...item} />;
			})}
		</div>
	);
};
