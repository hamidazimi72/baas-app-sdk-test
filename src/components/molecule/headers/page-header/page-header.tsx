import type { BreadcrumbPath } from '@/components/atom';
import { PrimaryBreadcrumb } from '@/components/atom';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type PageHeaderProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	paths: BreadcrumbPath[];
	onBack?: () => void;
	backTitle?: string;
	description?: React.ReactNode;
	actions?: React.ReactNode;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const PageHeader: React.FC<PageHeaderProps> = ({
	boxProps,
	//
	paths,
	onBack,
	backTitle,
	description,
	actions,
}) => {
	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div
			{...boxProps}
			className={cn(
				'mb-4 flex flex-col gap-3 border-b border-divider/15 pb-4 sm:flex-row sm:items-center sm:justify-between',
				boxProps?.className,
			)}
		>
			<div className='flex min-w-0 flex-col gap-1'>
				<PrimaryBreadcrumb paths={paths} onBack={onBack} backTitle={backTitle} />
				{description && <p className='ps-4 text-sm text-text-tertiary'>{description}</p>}
			</div>

			{actions && <div className='flex shrink-0 flex-wrap items-center gap-2'>{actions}</div>}
		</div>
	);
};
