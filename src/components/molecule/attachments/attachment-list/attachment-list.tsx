'use client';

import { useEffect, useRef, useState } from 'react';

import { Download, File, FileArchive, FileImage, FileText, Loader, TriangleAlert, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

/** The metadata block a ticket stores for an uploaded file. */
export type AttachmentFile = {
	attachmentId?: string;
	fileName?: string;
	filePath?: string;
	fileType?: string;
	fileSize?: number;
};

export type AttachmentStatus = 'uploading' | 'done' | 'failed';

export type AttachmentListItem = AttachmentFile & {
	id?: string;
	status?: AttachmentStatus;
	error?: string;
	/** Local object URL, so a picked image previews before its upload finishes. */
	previewUrl?: string;
};

export type AttachmentListProps = {
	boxProps?: React.ComponentProps<'ul'>;
	//
	items: AttachmentListItem[];
	size?: 'sm' | 'md';
	/**
	 * Resolves a stored file to a fetchable URL. Storage links are short-lived, so this is called per
	 * download instead of once — omit it and the download control is not rendered at all.
	 */
	onResolveUrl?: (item: AttachmentListItem) => Promise<string>;
	onRemove?: (item: AttachmentListItem, index: number) => void;
	removeLabel?: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const SIZE_UNITS = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];

export const formatFileSize = (value?: number): string => {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return '-';

	let size = value;
	let unit = 0;
	while (size >= 1024 && unit < SIZE_UNITS.length - 1) {
		size /= 1024;
		unit += 1;
	}

	return `${size.toLocaleString('fa-IR', { maximumFractionDigits: unit === 0 ? 0 : 1 })} ${SIZE_UNITS[unit]}`;
};

const isImage = (item: AttachmentListItem): boolean =>
	!!item.fileType?.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(item.fileName ?? '');

const getFileIcon = (item: AttachmentListItem): LucideIcon => {
	const type = item.fileType ?? '';
	if (isImage(item)) return FileImage;
	if (type === 'application/pdf' || type.startsWith('text/')) return FileText;
	if (/zip|rar|7z|tar|gzip/i.test(type) || /\.(zip|rar|7z|tar|gz)$/i.test(item.fileName ?? '')) return FileArchive;
	return File;
};

const getItemKey = (item: AttachmentListItem, index: number): string =>
	item.id || item.attachmentId || item.filePath || `${item.fileName}-${index}`;

// ─── Component ──────────────────────────────────────────────────────────────

export const AttachmentList: React.FC<AttachmentListProps> = ({
	boxProps,
	//
	items,
	size = 'md',
	onResolveUrl,
	onRemove,
	removeLabel = 'حذف فایل',
}) => {
	// ─── State ────────────────────────────────────────────────────────────────

	const [thumbs, setThumbs] = useState<Record<string, string>>({});
	const [busyKey, setBusyKey] = useState<string | null>(null);
	const requestedRef = useRef<Set<string>>(new Set());

	// ─── Computed ─────────────────────────────────────────────────────────────

	const sizeMap = {
		sm: { row: 'gap-2 px-2 py-1.5 text-xs', thumb: 'size-7', icon: 14 },
		md: { row: 'gap-2.5 px-3 py-2 text-xs', thumb: 'size-9', icon: 17 },
	} as const;

	const dims = sizeMap[size];

	// ─── Effects ──────────────────────────────────────────────────────────────

	// Thumbnails need their own signed URL. Each file is requested once — a stale link only matters if
	// the image is re-fetched, while every download re-resolves anyway.
	useEffect(() => {
		if (!onResolveUrl) return;

		items.forEach((item, index) => {
			const key = getItemKey(item, index);
			if (item.previewUrl || !isImage(item) || item.status === 'failed' || item.status === 'uploading') return;
			if (requestedRef.current.has(key)) return;

			requestedRef.current.add(key);
			onResolveUrl(item)
				.then((url) => url && setThumbs((current) => ({ ...current, [key]: url })))
				.catch(() => undefined);
		});
	}, [items, onResolveUrl]);

	// ─── Handlers ─────────────────────────────────────────────────────────────

	const downloadHandler = async (item: AttachmentListItem, key: string) => {
		if (!onResolveUrl || busyKey) return;

		setBusyKey(key);
		try {
			const url = await onResolveUrl(item);
			if (!url) return;

			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.target = '_blank';
			anchor.rel = 'noreferrer';
			anchor.download = item.fileName || '';
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
		} finally {
			setBusyKey(null);
		}
	};

	// ─── Render Helpers ───────────────────────────────────────────────────────

	const renderItem = (item: AttachmentListItem, index: number) => {
		const key = getItemKey(item, index);
		const name = item.fileName || 'فایل پیوست';
		const failed = item.status === 'failed';
		const uploading = item.status === 'uploading';
		const thumbUrl = item.previewUrl || thumbs[key];
		const showThumb = isImage(item) && !!thumbUrl && !failed;
		const Icon = getFileIcon(item);

		const downloadable = !!onResolveUrl && !failed && !uploading;
		const downloading = busyKey === key;

		return (
			<li
				key={key}
				className={cn(
					'flex min-w-0 items-center rounded-lg border bg-surface-primary',
					dims.row,
					failed ? 'border-danger/35 bg-danger/5' : 'border-divider/25',
				)}
			>
				<span
					className={cn(
						'flex shrink-0 items-center justify-center overflow-hidden rounded-md',
						dims.thumb,
						failed ? 'bg-danger/10 text-danger' : 'bg-surface-tertiary/70 text-text-tertiary',
					)}
				>
					{uploading ? (
						<Loader size={dims.icon} strokeWidth={1.8} className='animate-spin' />
					) : failed ? (
						<TriangleAlert size={dims.icon} strokeWidth={1.8} />
					) : showThumb ? (
						// A plain `<img>`, not `next/image`: the source is a short-lived signed storage URL, so the
						// optimizer would only add a hop it cannot cache.
						<img src={thumbUrl} alt='' className='size-full object-cover' loading='lazy' />
					) : (
						<Icon size={dims.icon} strokeWidth={1.7} />
					)}
				</span>

				<span className='flex min-w-0 flex-1 flex-col'>
					<span className='truncate text-text-secondary' title={name}>
						{name}
					</span>
					<span className={cn('truncate text-[11px]', failed ? 'text-danger' : 'text-text-tertiary')}>
						{failed
							? item.error || 'بارگذاری ناموفق بود'
							: uploading
								? 'در حال بارگذاری…'
								: formatFileSize(item.fileSize)}
					</span>
				</span>

				{downloadable && (
					<button
						type='button'
						onClick={() => downloadHandler(item, key)}
						disabled={downloading}
						aria-label={`دانلود ${name}`}
						title={`دانلود ${name}`}
						className='flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-progress'
					>
						{downloading ? (
							<Loader size={15} strokeWidth={1.8} className='animate-spin' />
						) : (
							<Download size={15} strokeWidth={1.8} />
						)}
					</button>
				)}

				{!!onRemove && (
					<button
						type='button'
						onClick={() => onRemove(item, index)}
						aria-label={`${removeLabel} ${name}`}
						title={removeLabel}
						className='flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40'
					>
						<X size={15} strokeWidth={1.8} />
					</button>
				)}
			</li>
		);
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	if (!items.length) return null;

	return (
		<ul {...boxProps} className={cn('flex flex-col gap-2', boxProps?.className)}>
			{items.map(renderItem)}
		</ul>
	);
};
