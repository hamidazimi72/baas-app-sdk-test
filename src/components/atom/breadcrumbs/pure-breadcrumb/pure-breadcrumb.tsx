import { cn } from '@/lib/utils';

export type PureBreadcrumbProps = {
	//
	boxProps?: React.ComponentProps<'div'>;
	nameProperty?: string;
	onClickProperty?: string;
	seperator?: string;
	paths: any[];

	pathProps?: React.ComponentProps<'span'>;
	nameProps?: React.ComponentProps<'span'>;
	seperatorProps?: React.ComponentProps<'span'>;
};

export const PureBreadcrumb: React.FC<PureBreadcrumbProps> = ({
	// box Control
	boxProps,
	pathProps,
	nameProps,
	seperatorProps,
	//
	nameProperty = 'name',
	onClickProperty = 'onClick',
	seperator = '/',
	paths = [],
}) => {
	return (
		<div {...boxProps}>
			{paths.map((item, i) => (
				<span
					{...pathProps}
					key={i}
					className={cn(pathProps?.className, item[onClickProperty] && 'cursor-pointer')}
					onClick={item[onClickProperty] ?? null}
				>
					<span key={`br-name-${i}`} {...nameProps}>
						{item[nameProperty] ?? ''}
					</span>
					{i + 1 < paths.length && (
						<span key={`br-seperator-${i}`} {...seperatorProps}>
							{seperator}
						</span>
					)}
				</span>
			))}
		</div>
	);
};
