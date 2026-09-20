import type { PureTabProps } from '@/components/atom';
import { PureTab } from '@/components/atom';

export const PrimaryTab: React.FC<PureTabProps> = ({
	children,
	// box Control
	boxProps,
	// custom props:
	headers = [],
	activeTabIndex = 0,
	controlledTab = false,
	//style
	headerClass = 'gap-3 p-3',
	headerBgColor = 'bg-surface-secondary',
	headerItemClass = 'p-3 border-b',
	headerItemActiveClass = 'border-primary text-primary',
	headerItemDeactiveClass = 'border-transparent text-text-tertiary',
	bodyClass = '',

	...props
}) => {
	return (
		<PureTab
			boxProps={boxProps}
			headers={headers}
			activeTabIndex={activeTabIndex}
			controlledTab={controlledTab}
			headerClass={`${headerClass} flex items-center`}
			headerBgColor={headerBgColor}
			headerItemActiveClass={headerItemActiveClass}
			headerItemDeactiveClass={headerItemDeactiveClass}
			headerItemClass={`${headerItemClass} grow cursor-pointer select-none`}
			bodyClass={`${bodyClass}`}
			{...props}
		>
			{children}
		</PureTab>
	);
};
