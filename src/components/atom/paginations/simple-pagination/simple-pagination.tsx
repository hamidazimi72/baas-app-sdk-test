import { cn } from '@/lib/utils';

export type SimplePaginationProps = {
	boxProps?: React.ComponentProps<'div'>;

	onChange?: (index: number) => void;
	onChangeSize?: (size: number) => void;
	pageSize?: number;
	pageIndex?: number;
	itemIndex?: number;
	total?: number;
	elClass?: string;
	bgColor?: string;
	borderColor?: string;
	buttonClass?: string;
	buttonBgColor?: string;
	buttonTextColor?: string;
	currentButtonBgColor?: string;
	currentTextColor?: string;
	jumpButtonBgColor?: string;
	jumpButtonTextColor?: string;
};

export const SimplePagination: React.FC<SimplePaginationProps> = ({
	// box Control
	boxProps,
	//
	onChange,
	onChangeSize,
	pageSize = 10,
	pageIndex = 0,
	itemIndex = 0,
	total = 0,

	elClass = '',
	bgColor = 'bg-transparent',
	borderColor = 'border-transparent',

	buttonClass = '',

	buttonBgColor = 'bg-transparent',
	buttonTextColor = 'text-text-secondary',

	currentButtonBgColor = 'bg-primary',
	currentTextColor = 'text-text-on-brand',

	jumpButtonBgColor = 'bg-transparent',
	jumpButtonTextColor = 'text-text-secondary',
}) => {
	//

	const pageCount = Math.ceil(total / pageSize);
	const currentPage = pageIndex || Math.floor((itemIndex + pageSize - 1) / pageSize);

	const pageButtonSize = 2;

	const prevPageCount = currentPage - 1 > pageButtonSize ? pageButtonSize : currentPage - 1;
	const nextPageCount = pageCount - pageButtonSize >= currentPage ? pageButtonSize : pageCount - currentPage;

	if (!total || total < 1) return null;
	if (!pageIndex && !itemIndex) return null;

	const showStartJump = currentPage > 1 + pageButtonSize;
	const showEndJump = currentPage < pageCount - pageButtonSize;

	const changeHandler = (index) => {
		if (onChange) onChange(index);
	};

	const CN = {
		el: cn(elClass, borderColor, bgColor, 'min-h-[50px] flex items-center justify-center gap-[2px] border-t text-xs'),
		button: cn(
			buttonClass,
			borderColor,
			'flex items-center justify-center py-[2px] px-1 min-w-[30px] min-h-[30px] rounded-[8px] hover:font-bold cursor-pointer',
		),
		currentButton: cn(currentButtonBgColor || buttonBgColor, currentTextColor || buttonTextColor),
		jumpButton: cn(
			jumpButtonBgColor || buttonBgColor,
			jumpButtonTextColor || buttonTextColor,
			'flex items-center justify-center gap-2 border border-text-tertiary/30 !rounded-[16px] px-3',
		),
		deactiveButton: cn(buttonBgColor, buttonTextColor),
	};

	return (
		<div {...boxProps} className={cn(boxProps?.className)}>
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-2 text-text-tertiary'>
					<span>سطر در صفحه</span>
					<span className='flex items-center gap-1'>
						{[10, 20, 50, 100].map((item, i) => {
							return (
								<div key={i} className='flex items-center gap-1'>
									{i !== 0 && <span className=''>/</span>}{' '}
									<button
										type='button'
										aria-label={`نمایش ${item} سطر در صفحه`}
										aria-pressed={pageSize === item}
										className={cn(
											'cursor-pointer rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
											pageSize === item && 'text-primary font-semibold',
										)}
										onClick={() => onChangeSize?.(item)}
									>
										{item}
									</button>
								</div>
							);
						})}
					</span>
				</div>

				{pageCount > 1 && (
					<div className={CN.el}>
						{showStartJump && (
							<>
								<button
									className={cn(CN.button, currentPage > 1 + pageButtonSize ? '' : 'pointer-events-none opacity-60')}
									onClick={() => changeHandler(1)}
								>
									<span>اولین</span>
								</button>

								<button className={cn(CN.button, 'opacity-70 pointer-events-none')}>
									<span>...</span>
								</button>
							</>
						)}

						{new Array(prevPageCount).fill('').map((item, i) => (
							<button
								onClick={() =>
									changeHandler(
										pageIndex
											? i + currentPage - prevPageCount
											: (i + currentPage - prevPageCount) * pageSize - pageSize + 1,
									)
								}
								key={i}
								className={cn(CN.button, CN.deactiveButton)}
							>
								{i + currentPage - prevPageCount}
							</button>
						))}

						<button className={cn(CN.button, CN.currentButton)}>{currentPage}</button>
						{new Array(nextPageCount).fill('').map((item, i) => (
							<button
								onClick={() => changeHandler(pageIndex ? currentPage + i + 1 : pageSize * (currentPage + i) + 1)}
								key={i}
								className={cn(CN.button, CN.deactiveButton)}
							>
								{currentPage + i + 1}
							</button>
						))}

						{showEndJump && (
							<>
								<button className={cn(CN.button, 'opacity-70 pointer-events-none')}>
									<span>...</span>
								</button>

								<button
									className={cn(
										CN.button,
										currentPage < pageCount - pageButtonSize ? '' : 'pointer-events-none opacity-60',
									)}
									onClick={() => changeHandler(pageIndex ? pageCount : pageCount * pageSize - pageSize + 1)}
								>
									<span>آخرین</span>
								</button>
							</>
						)}
					</div>
				)}
			</div>
		</div>
	);
};
