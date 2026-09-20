import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';
export type AvatarTone = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';

export type AvatarProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	name?: string;
	src?: string;
	size?: AvatarSize;
	tone?: AvatarTone;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const TONES: AvatarTone[] = ['primary', 'success', 'danger', 'warning', 'info'];

const initialsOf = (name: string): string => {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return '?';
	const first = parts[0]?.[0] ?? '';
	const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
	return (first + second).toUpperCase();
};

const toneFromName = (name: string): AvatarTone => {
	let hash = 0;
	for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % 9973;
	return TONES[hash % TONES.length] ?? 'primary';
};

// ─── Component ──────────────────────────────────────────────────────────────

export const Avatar: React.FC<AvatarProps> = ({
	boxProps,
	//
	name = '',
	src,
	size = 'md',
	tone,
}) => {
	// ─── Computed ─────────────────────────────────────────────────────────────

	const sizeMap: Record<AvatarSize, string> = {
		xs: 'size-6 text-[10px]',
		sm: 'size-8 text-xs',
		md: 'size-10 text-sm',
		lg: 'size-12 text-base',
	};

	const toneMap: Record<AvatarTone, string> = {
		primary: 'bg-primary/12 text-primary',
		success: 'bg-success/12 text-success',
		danger: 'bg-danger/12 text-danger',
		warning: 'bg-warning/12 text-warning',
		info: 'bg-info/12 text-info',
		neutral: 'bg-surface-tertiary text-text-secondary',
	};

	const resolvedTone = tone ?? (name ? toneFromName(name) : 'neutral');

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div
			{...boxProps}
			className={cn(
				'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold ring-1 ring-divider/15',
				sizeMap[size],
				!src && toneMap[resolvedTone],
				boxProps?.className,
			)}
		>
			{src ? (
				// Arbitrary remote avatar URL → plain <img> (next/image needs a configured host); lazy-loaded.
				<img src={src} alt={name} loading='lazy' decoding='async' className='size-full object-cover' />
			) : (
				initialsOf(name)
			)}
		</div>
	);
};
