import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

export type PureTabProps = {
	children?: React.ReactNode;
	boxProps?: React.ComponentProps<'div'>;

	headers?: string[] | (() => ReactNode)[];
	activeTabIndex?: number | null;
	controlledTab?: boolean;
	onSelect?: null | ((index: number) => void);
	headerClass?: string;
	headerBgColor?: string;
	headerItemClass?: string;
	headerItemDeactiveClass?: string;
	headerItemActiveClass?: string;
	bodyClass?: string;
};

export const PureTab: React.FC<PureTabProps> = ({
	children,
	// box control
	boxProps,

	// custom props:
	headers = [],
	activeTabIndex = 0,
	controlledTab = false,
	onSelect = null,
	// styles
	headerClass = '',
	headerBgColor = '',

	headerItemClass = '',
	headerItemDeactiveClass = '',
	headerItemActiveClass = '',

	bodyClass = '',
}) => {
	//
	const [activeIndex, setActiveIndex] = useState(activeTabIndex || (controlledTab ? null : 0));

	useEffect(() => {
		if (controlledTab) setActiveIndex(activeTabIndex);
	}, [activeTabIndex, controlledTab]);

	const selectHandler = (i: number) => {
		if (!controlledTab) setActiveIndex(i);
		else if (controlledTab && onSelect) onSelect(i);
	};

	return (
		<div {...boxProps} className={cn(boxProps?.className)}>
			<div role='tablist' className={cn(headerClass, headerBgColor)}>
				{headers.map((title, i) => (
					<button
						key={i}
						type='button'
						role='tab'
						aria-selected={i === activeIndex}
						onClick={() => selectHandler(i)}
						className={cn(
							headerItemClass,
							'transition-all duration-200 ease-premium active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
							i === activeIndex ? headerItemActiveClass : headerItemDeactiveClass,
						)}
					>
						{typeof title === 'function' ? title() : title}
					</button>
				))}
			</div>
			<div key={activeIndex} className={cn(bodyClass, 'animate-fade-up')}>
				{(children && activeIndex !== null && children[activeIndex]) || null}
			</div>
		</div>
	);
};
