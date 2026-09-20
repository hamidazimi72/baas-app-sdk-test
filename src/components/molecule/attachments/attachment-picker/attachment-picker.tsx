'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { Paperclip, Upload } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { AttachmentFile, AttachmentListItem } from '../attachment-list/attachment-list';
import { AttachmentList, formatFileSize } from '../attachment-list/attachment-list';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AttachmentPickerProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	value: AttachmentFile[];
	onChange: (files: AttachmentFile[]) => void;
	/** Uploads one file and resolves with the metadata the API stores; rejects with a readable error. */
	onUpload: (file: File) => Promise<AttachmentFile>;
	//
	maxFiles?: number;
	maxFileSize?: number;
	accept?: string;
	disabled?: boolean;
	label?: string;
	description?: string;
};

// Only in-flight and failed picks live here; a finished upload moves into the controlled `value`, so
// there is exactly one owner per file at any moment.
type PendingDraft = {
	id: string;
	fileName: string;
	fileSize: number;
	fileType: string;
	status: 'uploading' | 'failed';
	error?: string;
	previewUrl?: string;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const AttachmentPicker: React.FC<AttachmentPickerProps> = ({
	boxProps,
	//
	value,
	onChange,
	onUpload,
	//
	maxFiles = 10,
	maxFileSize,
	accept,
	disabled = false,
	label = 'فایل پیوست',
	description,
}) => {
	// ─── State ────────────────────────────────────────────────────────────────

	const inputId = useId();

	const [pending, setPending] = useState<PendingDraft[]>([]);
	const [message, setMessage] = useState<string | null>(null);
	const [dragging, setDragging] = useState(false);

	// Uploads resolve independently, so each completion must append to the newest list rather than the
	// one captured when the file was picked.
	const valueRef = useRef(value);
	valueRef.current = value;

	// Two uploads finishing in the same tick would both read the pre-render prop and the second write
	// would drop the first, so the ref advances with the emitted list instead of waiting for a render.
	const commit = (files: AttachmentFile[]) => {
		valueRef.current = files;
		onChange(files);
	};

	// ─── Computed ─────────────────────────────────────────────────────────────

	const uploaded: AttachmentListItem[] = value.map((file, index) => ({
		...file,
		id: file.filePath || `${file.fileName}-${index}`,
		status: 'done',
	}));

	const items: AttachmentListItem[] = [...uploaded, ...pending];
	const count = items.length;
	const full = count >= maxFiles;
	const busy = pending.some((draft) => draft.status === 'uploading');
	const locked = disabled || full;

	const hint =
		description ??
		`حداکثر ${maxFiles.toLocaleString('fa-IR')} فایل${maxFileSize ? ` و هر فایل تا ${formatFileSize(maxFileSize)}` : ''}`;

	// ─── Effects ──────────────────────────────────────────────────────────────

	// Local previews are object URLs; without this they stay allocated for the page's lifetime. The
	// latest drafts are read through a ref so unmount cleanup never runs against a stale snapshot.
	const pendingRef = useRef(pending);
	pendingRef.current = pending;

	useEffect(
		() => () => {
			pendingRef.current.forEach((draft) => draft.previewUrl && URL.revokeObjectURL(draft.previewUrl));
		},
		[],
	);

	// ─── Handlers ─────────────────────────────────────────────────────────────

	const dropDraft = (id: string) =>
		setPending((drafts) => {
			const previewUrl = drafts.find((draft) => draft.id === id)?.previewUrl;
			if (previewUrl) URL.revokeObjectURL(previewUrl);
			return drafts.filter((draft) => draft.id !== id);
		});

	const uploadHandler = async (file: File, id: string) => {
		try {
			const result = await onUpload(file);
			dropDraft(id);
			commit([...valueRef.current, result]);
		} catch (error) {
			const reason = error instanceof Error ? error.message : 'خطا در بارگذاری فایل';
			setPending((drafts) =>
				drafts.map((draft) => (draft.id === id ? { ...draft, status: 'failed', error: reason } : draft)),
			);
		}
	};

	const addFilesHandler = (fileList: FileList | File[] | null) => {
		const files = Array.from(fileList ?? []);
		if (!files.length || disabled) return;

		const rejected: string[] = [];
		const accepted: File[] = [];
		let room = Math.max(maxFiles - count, 0);

		for (const file of files) {
			if (room <= 0) {
				rejected.push(`حداکثر ${maxFiles.toLocaleString('fa-IR')} فایل قابل پیوست است.`);
				break;
			}
			if (maxFileSize && file.size > maxFileSize) {
				rejected.push(`«${file.name}» بزرگ‌تر از ${formatFileSize(maxFileSize)} است.`);
				continue;
			}
			accepted.push(file);
			room -= 1;
		}

		setMessage(rejected.length ? rejected[0]! : null);

		const drafts = accepted.map((file) => ({
			id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			fileName: file.name,
			fileSize: file.size,
			fileType: file.type,
			status: 'uploading' as const,
			previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
		}));

		if (drafts.length) setPending((current) => [...current, ...drafts]);
		drafts.forEach((draft, index) => void uploadHandler(accepted[index]!, draft.id));
	};

	const selectHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
		addFilesHandler(event.target.files);
		// Re-picking the same file must fire `change` again.
		event.target.value = '';
	};

	const removeHandler = (item: AttachmentListItem) => {
		if (item.status === 'done') {
			commit(valueRef.current.filter((file) => file.filePath !== item.filePath));
			return;
		}
		if (item.id) dropDraft(item.id);
	};

	const dropHandler = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setDragging(false);
		if (!locked) addFilesHandler(event.dataTransfer?.files ?? null);
	};

	const dragOverHandler = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		if (!locked) setDragging(true);
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div {...boxProps} className={cn('flex flex-col gap-2', boxProps?.className)}>
			<div className='flex items-center justify-between gap-2'>
				<span className='flex items-center gap-1.5 text-xs font-medium text-text-secondary'>
					<Paperclip size={14} strokeWidth={1.8} className='shrink-0 text-text-tertiary' />
					{label}
				</span>
				<span className='shrink-0 text-[11px] tabular-nums text-text-tertiary'>
					{count.toLocaleString('fa-IR')} از {maxFiles.toLocaleString('fa-IR')}
				</span>
			</div>

			{/* The label is the control — the input stays visually hidden but focusable, so pointer,
			    keyboard and drag-and-drop all reach the same picker. */}
			<div
				onDrop={dropHandler}
				onDragOver={dragOverHandler}
				onDragLeave={() => setDragging(false)}
				className={cn(
					'flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-4 text-center transition-colors',
					dragging ? 'border-primary bg-primary/5' : 'border-divider/40 bg-surface-secondary/40',
					locked && 'opacity-60',
				)}
			>
				<label
					htmlFor={inputId}
					className={cn(
						'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-within:ring-2 focus-within:ring-primary/40',
						locked ? 'cursor-not-allowed text-text-tertiary' : 'cursor-pointer text-primary hover:bg-primary/10',
					)}
				>
					<Upload size={15} strokeWidth={1.8} />
					{busy ? 'در حال بارگذاری…' : 'انتخاب فایل یا کشیدن و رها کردن'}
					<input
						id={inputId}
						type='file'
						multiple
						accept={accept}
						disabled={locked}
						onChange={selectHandler}
						className='sr-only'
					/>
				</label>

				<span className='text-[11px] text-text-tertiary'>{hint}</span>
			</div>

			{!!message && (
				<p role='alert' aria-live='polite' className='text-[11px] text-danger'>
					{message}
				</p>
			)}

			<AttachmentList items={items} size='md' onRemove={removeHandler} />
		</div>
	);
};
