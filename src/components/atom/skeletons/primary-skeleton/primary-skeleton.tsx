import { cn } from '@/lib/utils';

export type PrimarySkeletonProps = {
	children?: React.ReactNode;
	boxProps?: React.ComponentProps<'div'>;
	elProps?: React.ComponentProps<'div'>;

	bgColor?: string;
	holderColorHex?: string;
	roundedClass?: string;
	shadowClass?: string;
};

export const PrimarySkeleton: React.FC<PrimarySkeletonProps> = ({
	children,
	boxProps,
	elProps,

	bgColor = 'bg-divider/50',
	holderColorHex = '#ccc',

	roundedClass = 'rounded',
	shadowClass = 'shadow',
}) => {
	const gradient = `linear-gradient(90deg, transparent 0%, transparent 30%, ${holderColorHex} 40%, ${holderColorHex} 60%, transparent 70%, transparent 100%)`;

	return (
		<div {...boxProps} className={cn(boxProps?.className)}>
			<div
				{...elProps}
				className={cn(elProps?.className, bgColor, roundedClass, shadowClass, 'h-full w-full grow overflow-hidden')}
			>
				<div className='animate-holder w-full h-full blur-[1px]' style={{ background: gradient }}>
					{children}
				</div>
			</div>
		</div>
	);
};
