import Image from 'next/image';

import { Bell, ImageIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type MobileNotificationFrameMode = 'initial' | 'expanded';

export type MobileNotificationFrameProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	appName?: string;
	title?: string;
	body?: string;
	imageUrl?: string;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const MobileNotificationFrame: React.FC<MobileNotificationFrameProps> = ({
	boxProps,
	//
	title = '',
	body = '',
	imageUrl = '',
}) => {
	// ─── State ─────────────────────────────────────────────────────────────
	const [previewMode, setPreviewMode] = useState<MobileNotificationFrameMode>('initial');

	// ─── Computed ─────────────────────────────────────────────────────────────

	const isExpanded = previewMode === 'expanded';

	// ─── Handlers ─────────────────────────────────────────────────────────────

	const initialModeHandler = () => setPreviewMode('initial');
	const expandedModeHandler = () => setPreviewMode('expanded');

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div {...boxProps} className={cn(boxProps?.className)}>
			<div className='mb-4 flex justify-center'>
				<div className='flex gap-1 rounded-lg bg-surface-tertiary p-1'>
					<button
						type='button'
						aria-pressed={!isExpanded}
						onClick={initialModeHandler}
						className={cn(
							'rounded-md px-3 py-1.5 text-xs transition-colors',
							!isExpanded ? 'bg-primary text-text-on-brand shadow-sm' : 'text-text-tertiary hover:bg-surface-primary',
						)}
					>
						حالت اولیه
					</button>
					<button
						type='button'
						aria-pressed={isExpanded}
						onClick={expandedModeHandler}
						className={cn(
							'rounded-md px-3 py-1.5 text-xs transition-colors',
							isExpanded ? 'bg-primary text-text-on-brand shadow-sm' : 'text-text-tertiary hover:bg-surface-primary',
						)}
					>
						حالت بازشده
					</button>
				</div>
			</div>

			<div className='relative mx-auto h-44 w-[82%] max-w-72 rounded-t-4xl bg-text-primary p-1.5 pb-0 shadow-xl'>
				<div className='h-full overflow-hidden rounded-t-[1.75rem] bg-surface-tertiary/80 px-2.5 pt-2'>
					<div className='relative mb-2 h-4'>
						<span className='absolute left-1/2 top-0 size-4 -translate-x-1/2 rounded-full bg-surface-primary ring-2 ring-divider/30' />
					</div>

					<div className='overflow-hidden rounded-xl border border-divider/20 bg-surface-primary shadow-lg'>
						<div className='flex items-start gap-2 p-2.5'>
							<span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-text-on-brand'>
								<Bell size={16} strokeWidth='1.5px' />
							</span>
							<div className='min-w-0 grow'>
								<div className='flex items-center justify-between gap-2'>
									<span className='truncate text-[11px] font-semibold text-text-primary'>{title || 'عنوان اعلان'}</span>
								</div>

								<p
									className={cn(
										'mt-0.5 text-[10px] leading-4 text-text-tertiary',
										isExpanded ? 'line-clamp-2' : 'line-clamp-1',
									)}
								>
									{body || 'متن اعلان اینجا نمایش داده می‌شود.'}
								</p>
							</div>

							{!isExpanded && imageUrl && (
								<Image
									src={imageUrl}
									alt='تصویر اعلان'
									width={32}
									height={32}
									unoptimized
									className='h-8 w-8 object-cover'
								/>
							)}
							{!isExpanded && !imageUrl && <ImageIcon size={30} strokeWidth='1.25px' />}
						</div>

						{isExpanded && (
							<div className='border-t border-divider/15'>
								{imageUrl ? (
									<Image
										src={imageUrl}
										alt='تصویر اعلان'
										width={280}
										height={72}
										unoptimized
										className='h-18 w-full object-cover'
									/>
								) : (
									<div className='flex h-18 items-center justify-center bg-surface-secondary text-text-tertiary'>
										<ImageIcon size={26} strokeWidth='1.25px' />
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
