import React from 'react';

import { cn } from '@/lib/utils';

export type BlockProps = {
	children?: React.ReactNode;
	//
	boxProps?: React.ComponentProps<'div'>;
};

export const Block: React.FC<BlockProps> = ({
	children,
	//
	boxProps,
}) => {
	return (
		<div {...boxProps} className={cn(boxProps?.className)}>
			{children}
		</div>
	);
};
