'use client';

import { useState } from 'react';

import Image from 'next/image';

import { ImageIcon, Smartphone, Tablet } from 'lucide-react';

import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export type InappMessageFrameLayout = 'Card' | 'Modal' | 'ImageOnly' | 'TopBanner';

export type InappMessageFrameProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	layout: InappMessageFrameLayout;
	title?: string;
	body?: string;
	imageUrl?: string;
	backgroundColor?: string;
	textColor?: string;
	buttonText?: string;
	buttonBackgroundColor?: string;
	buttonTextColor?: string;
	secondaryButtonText?: string;
	secondaryButtonBackgroundColor?: string;
	secondaryButtonTextColor?: string;
};

type Device = 'mobile' | 'tablet';
type Orientation = 'portrait' | 'landscape';

type MessagePreviewProps = Omit<InappMessageFrameProps, 'boxProps'> & {
	device: Device;
	orientation: Orientation;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const DEVICE_LABELS: Record<Device, string> = {
	mobile: 'موبایل',
	tablet: 'تبلت',
};

const ORIENTATION_LABELS: Record<Orientation, string> = {
	portrait: 'عمودی',
	landscape: 'افقی',
};

const ORIENTATIONS: Orientation[] = ['portrait', 'landscape'];

// ─── Message Preview ─────────────────────────────────────────────────────────

const MessagePreview: React.FC<MessagePreviewProps> = ({
	layout,
	device,
	orientation,
	title = '',
	body = '',
	imageUrl = '',
	backgroundColor = '#ffffff',
	textColor = '#000000',
	buttonText = '',
	buttonBackgroundColor = '#000000',
	buttonTextColor = '#ffffff',
	secondaryButtonText = '',
	secondaryButtonBackgroundColor = '#ffffff',
	secondaryButtonTextColor = '#000000',
}) => {
	const portrait = orientation === 'portrait';
	const mobile = device === 'mobile';
	const horizontalContent = orientation === 'landscape' || device === 'tablet';
	const frameClassName = mobile
		? portrait
			? 'aspect-[1/2] w-42 rounded-[2.25rem] border-[5px]'
			: 'aspect-[2/1] w-84 rounded-[2.25rem] border-[5px]'
		: portrait
			? 'aspect-[3/4] w-56 rounded-2xl border-[9px]'
			: 'aspect-[5/3] w-92 rounded-2xl border-[9px]';
	const messageClassName =
		layout === 'TopBanner'
			? 'absolute inset-x-2 top-3 flex-row rounded-lg'
			: layout === 'Modal'
				? 'w-4/5 flex-col rounded-xl'
				: horizontalContent
					? 'w-4/5 flex-row rounded-lg'
					: 'w-3/4 flex-col rounded-lg';
	const imageClassName =
		layout === 'TopBanner'
			? 'size-11 shrink-0 rounded-md'
			: horizontalContent
				? 'min-h-24 w-2/5 shrink-0'
				: 'aspect-video w-full';
	const showContent = layout !== 'ImageOnly';
	const hasActions = !!buttonText || !!secondaryButtonText;

	return (
		<section
			className='flex w-full flex-col items-center gap-2.5'
			aria-label={`${DEVICE_LABELS[device]} ${ORIENTATION_LABELS[orientation]}`}
		>
			<div className='flex items-center gap-2 text-xs font-medium text-text-tertiary'>
				<span className='h-px w-7 bg-divider/40' />
				{ORIENTATION_LABELS[orientation]}
				<span className='h-px w-7 bg-divider/40' />
			</div>
			<div
				className={cn(
					'relative max-w-full overflow-hidden border-text-primary bg-surface-tertiary shadow-xl ring-1 ring-divider/30',
					frameClassName,
				)}
			>
				<span
					className={cn(
						'absolute z-20 bg-text-primary ring-2 ring-surface-tertiary',
						mobile ? 'size-3 rounded-full' : 'size-1.5 rounded-full',
						portrait ? 'left-1/2 top-2 -translate-x-1/2' : 'right-2 top-1/2 -translate-y-1/2',
					)}
				/>
				<div
					className={cn(
						'relative flex size-full items-center justify-center overflow-hidden',
						mobile ? 'rounded-[1.9rem]' : 'rounded-lg',
					)}
				>
					<div className='absolute inset-0 bg-surface-secondary/30' />
					<div
						className={cn(
							'relative z-10 flex max-h-[85%] overflow-hidden shadow-xl ring-1 ring-divider/10',
							messageClassName,
						)}
						style={{ backgroundColor, color: textColor }}
					>
						{imageUrl ? (
							<Image
								src={imageUrl}
								alt='تصویر پیام درون‌برنامه‌ای'
								width={320}
								height={240}
								unoptimized
								className={cn('object-cover', layout === 'ImageOnly' ? 'size-full' : imageClassName)}
							/>
						) : (
							<div
								className={cn(
									'flex items-center justify-center bg-surface-secondary text-text-tertiary',
									layout === 'ImageOnly' ? 'aspect-square size-full' : imageClassName,
								)}
							>
								<ImageIcon size={22} strokeWidth={1.4} />
							</div>
						)}
						{showContent && (
							<div className='flex min-w-0 flex-1 flex-col items-start justify-center gap-1.5 p-3 text-right'>
								<strong className='w-full truncate text-[11px]'>{title || 'عنوان پیام'}</strong>
								<p className='line-clamp-4 w-full text-[9px] leading-4 opacity-80'>{body || 'متن پیام'}</p>
								{hasActions && (
									<div className='flex w-full flex-wrap items-center justify-end gap-1.5'>
										{secondaryButtonText && (
											<span
												className='rounded-md px-2.5 py-1.5 text-[9px] font-medium shadow-sm'
												style={{
													backgroundColor: secondaryButtonBackgroundColor,
													color: secondaryButtonTextColor,
												}}
											>
												{secondaryButtonText}
											</span>
										)}
										{buttonText && (
											<span
												className='rounded-md px-2.5 py-1.5 text-[9px] font-medium shadow-sm'
												style={{ backgroundColor: buttonBackgroundColor, color: buttonTextColor }}
											>
												{buttonText}
											</span>
										)}
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</section>
	);
};

// ─── Component ───────────────────────────────────────────────────────────────

export const InappMessageFrame: React.FC<InappMessageFrameProps> = ({
	boxProps,
	//
	...messageProps
}) => {
	const [device, setDevice] = useState<Device>('mobile');

	const deviceHandler = (value: Device) => setDevice(value);
	const previews = ORIENTATIONS.map((orientation) => (
		<MessagePreview key={orientation} {...messageProps} device={device} orientation={orientation} />
	));

	return (
		<div {...boxProps} className={cn('flex flex-col gap-5', boxProps?.className)}>
			<div className='flex justify-center'>
				<div className='flex items-center gap-1 rounded-xl border border-divider/20 bg-surface-tertiary p-1 shadow-sm'>
					<button
						type='button'
						aria-pressed={device === 'mobile'}
						onClick={() => deviceHandler('mobile')}
						className={cn(
							'flex min-w-24 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
							device === 'mobile'
								? 'bg-primary text-text-on-brand shadow-sm'
								: 'text-text-tertiary hover:bg-surface-primary hover:text-text-primary',
						)}
					>
						<Smartphone size={15} strokeWidth={1.8} />
						موبایل
					</button>
					<button
						type='button'
						aria-pressed={device === 'tablet'}
						onClick={() => deviceHandler('tablet')}
						className={cn(
							'flex min-w-24 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
							device === 'tablet'
								? 'bg-primary text-text-on-brand shadow-sm'
								: 'text-text-tertiary hover:bg-surface-primary hover:text-text-primary',
						)}
					>
						<Tablet size={15} strokeWidth={1.8} />
						تبلت
					</button>
				</div>
			</div>
			<div className='flex flex-col items-center gap-6 rounded-2xl border border-divider/20 bg-surface-primary px-3 py-5'>
				{previews}
			</div>
		</div>
	);
};
