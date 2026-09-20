import React from 'react';

import { cn } from '@/lib/utils';

type ScreenLayoutProps = {
	boxProps?: React.ComponentProps<'div'>;
	header?: React.ReactNode;
	footer?: React.ReactNode;
	children?: React.ReactNode;
};

export const ScreenLayout: React.FC<ScreenLayoutProps> = ({ boxProps, header, footer, children }) => {
	return (
		<div {...boxProps} className={cn('flex flex-col', boxProps?.className, 'h-dvh')}>
			{!!header && <div className='flex-none'>{header}</div>}
			<div className='flex-1 overflow-auto'>{children}</div>
			{!!footer && <div className='flex-none'>{footer}</div>}
		</div>
	);
};
