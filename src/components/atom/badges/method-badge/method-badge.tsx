import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | (string & {});
export type MethodBadgeSize = 'sm' | 'md';

export type MethodBadgeProps = {
	boxProps?: React.ComponentProps<'span'>;
	//
	method: HttpMethod;
	size?: MethodBadgeSize;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const MethodBadge: React.FC<MethodBadgeProps> = ({
	boxProps,
	//
	method,
	size = 'md',
}) => {
	// ─── Computed ─────────────────────────────────────────────────────────────

	const normalized = String(method).toUpperCase();

	const toneMap: Record<string, string> = {
		GET: 'bg-info/10 text-info ring-info/25',
		POST: 'bg-success/10 text-success ring-success/25',
		PUT: 'bg-warning/10 text-warning ring-warning/25',
		PATCH: 'bg-warning/10 text-warning ring-warning/25',
		DELETE: 'bg-danger/10 text-danger ring-danger/25',
	};

	const sizeMap: Record<MethodBadgeSize, string> = {
		sm: 'min-w-12 px-1.5 py-0.5 text-[10px]',
		md: 'min-w-14 px-2 py-0.5 text-xs',
	};

	const tone = toneMap[normalized] ?? 'bg-surface-tertiary text-text-secondary ring-divider/30';

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<span
			{...boxProps}
			className={cn(
				'dir-ltr inline-flex items-center justify-center rounded-md text-center font-mono font-semibold tracking-wide ring-1 ring-inset',
				sizeMap[size],
				tone,
				boxProps?.className,
			)}
		>
			{normalized}
		</span>
	);
};
