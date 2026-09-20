import { RotateCcw } from 'lucide-react';

import { cn } from '@/lib/utils';

export type ContentFailedProps = {
	boxProps?: React.ComponentProps<'div'>;
	boxBackdropBlur?: string;
	boxOpacity?: string;
	boxBgColor?: string;
	elClass?: string;
	elSize?: string;
	elSpace?: string;
	elOpacity?: string;
	onReload?: (() => void) | null;
};

export const ContentFailed: React.FC<ContentFailedProps> = ({
	// Box Control
	boxProps,
	boxBackdropBlur = 'backdrop-blur-[2px]',
	boxOpacity = '',
	boxBgColor = '',
	// Loader Control
	elClass = '',
	elSize = 'max-h-[75%] min-h-[90px]',
	elSpace = 'm-[20px]',
	elOpacity = 'opacity-50',
	onReload = null,
}) => {
	return (
		<div
			{...boxProps}
			className={cn(
				boxProps?.className,
				boxOpacity,
				boxBgColor,
				boxBackdropBlur,
				'absolute bg-danger/30 top-0 right-0 left-0 bottom-0 flex flex-col items-center justify-center gap-4 select-none z-4',
			)}
		>
			<div
				className={cn(elClass, elSize, elSpace, elOpacity, 'w-full flex flex-col items-center justify-center gap-3')}
			>
				{onReload && (
					<button
						type='button'
						onClick={onReload}
						title='تلاش مجدد'
						aria-label='تلاش مجدد'
						className='cursor-pointer rounded-full p-1 transition hover:animate-spin focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
					>
						<RotateCcw size={26} strokeWidth='2px' />
					</button>
				)}
				<span className='animate-pulse'>خطایی پیش آمده</span>
			</div>
		</div>
	);
};
