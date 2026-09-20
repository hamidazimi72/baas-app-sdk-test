import type { ReactNode } from 'react';

import { ContentFailed, ContentLoader, PageLoader } from '@/components/atom';
import { cn } from '@/lib/utils';

export type PrimaryCardProps = {
	children?: ReactNode;
	boxProps?: React.ComponentProps<'div'>;
	elProps?: React.ComponentProps<'div'>;
	bgColor?: string;
	textColor?: string;
	loading?: boolean;
	status?: 'init' | 'loading' | 'fail' | 'ok';
	loadingType?: 'pageLoader' | 'container' | (() => ReactNode) | null;
	onReload?: (() => void) | null;
	notFound?: boolean;
	notFoundEl?: (() => ReactNode) | string | null;
	transparent?: boolean;
	shadow?: boolean;
	border?: boolean;
	rounded?: boolean;
};

export const PrimaryCard: React.FC<PrimaryCardProps> = ({
	children,
	boxProps,
	elProps,
	bgColor = 'bg-surface-primary',
	textColor = 'text-text-primary',
	status,
	loading = false,
	loadingType = 'container',
	onReload = null,
	notFound = false,
	notFoundEl = 'موردی یافت نشد',
	transparent = true,
	shadow = false,
	border = false,
	rounded = false,
}) => {
	const isLoading = loading || status === 'loading';
	const isFail = !loading && status === 'fail';
	const isNotFound = status === 'ok' && notFound && notFoundEl != null;

	const wrapperClassName = cn(
		'w-full',
		textColor,
		transparent ? 'bg-transparent' : bgColor,
		isLoading && loadingType && 'pointer-events-none',
		isFail && 'opacity-50',
		shadow && 'shadow-md',
		border && 'border',
		rounded && 'rounded-lg',
		elProps?.className,
	);

	const renderContent = () => {
		if (isNotFound) {
			return typeof notFoundEl === 'function' ? (
				notFoundEl()
			) : (
				<div className='h-25 flex items-center justify-center'>{notFoundEl}</div>
			);
		}
		if (isLoading && typeof loadingType === 'function') return loadingType();
		return children;
	};

	return (
		<ContentLoader loading={isLoading && loadingType === 'container'} {...boxProps}>
			{isLoading && loadingType === 'pageLoader' && <PageLoader />}
			{isFail && <ContentFailed onReload={onReload} />}
			<div {...elProps} className={wrapperClassName}>
				{renderContent()}
			</div>
		</ContentLoader>
	);
};
