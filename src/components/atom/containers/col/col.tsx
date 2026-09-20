import { cn } from '@/lib/utils';

type Spans = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type ColProps = {
	children?: React.ReactNode;
	boxProps?: React.ComponentProps<'div'>;

	size?: Spans;
	smSize?: Spans;
	mdSize?: Spans;
	lgSize?: Spans;
};

export const Col: React.FC<ColProps> = ({
	children,
	boxProps,

	size = 12,
	smSize = undefined,
	mdSize = undefined,
	lgSize = undefined,
}) => {
	const generateColCls = (colNumber, size?: 'sm' | 'md' | 'lg') => {
		if (!colNumber) return null;
		if (!size)
			return (
				(+colNumber === 12 && 'col-span-12') ||
				(+colNumber === 11 && 'col-span-11') ||
				(+colNumber === 10 && 'col-span-10') ||
				(+colNumber === 9 && 'col-span-9') ||
				(+colNumber === 8 && 'col-span-8') ||
				(+colNumber === 7 && 'col-span-7') ||
				(+colNumber === 6 && 'col-span-6') ||
				(+colNumber === 5 && 'col-span-5') ||
				(+colNumber === 4 && 'col-span-4') ||
				(+colNumber === 3 && 'col-span-3') ||
				(+colNumber === 2 && 'col-span-2') ||
				(+colNumber === 1 && 'col-span-1') ||
				'col-span-12'
			);
		if (size === 'sm')
			return (
				(+colNumber === 12 && 'sm:col-span-12') ||
				(+colNumber === 11 && 'sm:col-span-11') ||
				(+colNumber === 10 && 'sm:col-span-10') ||
				(+colNumber === 9 && 'sm:col-span-9') ||
				(+colNumber === 8 && 'sm:col-span-8') ||
				(+colNumber === 7 && 'sm:col-span-7') ||
				(+colNumber === 6 && 'sm:col-span-6') ||
				(+colNumber === 5 && 'sm:col-span-5') ||
				(+colNumber === 4 && 'sm:col-span-4') ||
				(+colNumber === 3 && 'sm:col-span-3') ||
				(+colNumber === 2 && 'sm:col-span-2') ||
				(+colNumber === 1 && 'sm:col-span-1') ||
				'sm:col-span-12'
			);
		if (size === 'md')
			return (
				(+colNumber === 12 && 'md:col-span-12') ||
				(+colNumber === 11 && 'md:col-span-11') ||
				(+colNumber === 10 && 'md:col-span-10') ||
				(+colNumber === 9 && 'md:col-span-9') ||
				(+colNumber === 8 && 'md:col-span-8') ||
				(+colNumber === 7 && 'md:col-span-7') ||
				(+colNumber === 6 && 'md:col-span-6') ||
				(+colNumber === 5 && 'md:col-span-5') ||
				(+colNumber === 4 && 'md:col-span-4') ||
				(+colNumber === 3 && 'md:col-span-3') ||
				(+colNumber === 2 && 'md:col-span-2') ||
				(+colNumber === 1 && 'md:col-span-1') ||
				'md:col-span-12'
			);
		if (size === 'lg')
			return (
				(+colNumber === 12 && 'lg:col-span-12') ||
				(+colNumber === 11 && 'lg:col-span-11') ||
				(+colNumber === 10 && 'lg:col-span-10') ||
				(+colNumber === 9 && 'lg:col-span-9') ||
				(+colNumber === 8 && 'lg:col-span-8') ||
				(+colNumber === 7 && 'lg:col-span-7') ||
				(+colNumber === 6 && 'lg:col-span-6') ||
				(+colNumber === 5 && 'lg:col-span-5') ||
				(+colNumber === 4 && 'lg:col-span-4') ||
				(+colNumber === 3 && 'lg:col-span-3') ||
				(+colNumber === 2 && 'lg:col-span-2') ||
				(+colNumber === 1 && 'lg:col-span-1') ||
				'lg:col-span-12'
			);
	};

	const colClassname = generateColCls(size);
	const smColClassname = generateColCls(smSize, 'sm') || colClassname;
	const mdColClassname = generateColCls(mdSize, 'md') || smColClassname;
	const lgColClassname = generateColCls(lgSize, 'lg') || mdColClassname;

	return (
		<div
			{...boxProps}
			className={cn(boxProps?.className, colClassname, smColClassname, mdColClassname, lgColClassname)}
		>
			{children}
		</div>
	);
};
