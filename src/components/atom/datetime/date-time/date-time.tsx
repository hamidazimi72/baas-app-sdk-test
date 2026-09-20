import { cn } from '@/lib/utils';
import { DateAPI } from '@/helper';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DateTimeFormat = 'full' | 'date' | 'time' | 'relative';

export type DateTimeProps = {
	boxProps?: React.ComponentProps<'time'>;
	//
	value?: number | string | Date | null;
	format?: DateTimeFormat;
	dir?: 'ltr' | 'rtl';
	fallback?: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 60 * 60 * 24 * 365],
	['month', 60 * 60 * 24 * 30],
	['day', 60 * 60 * 24],
	['hour', 60 * 60],
	['minute', 60],
	['second', 1],
];

const toDate = (value: number | string | Date): Date | null => {
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
	// epoch seconds (< year ~2001 in ms) are upscaled to ms
	if (typeof value === 'number') return new Date(value < 1e12 ? value * 1000 : value);
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const relativeText = (date: Date): string => {
	const rtf = new Intl.RelativeTimeFormat('fa', { numeric: 'auto' });
	const deltaSec = Math.round((date.getTime() - Date.now()) / 1000);
	const absSec = Math.abs(deltaSec);

	for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
		if (absSec >= secondsInUnit || unit === 'second') return rtf.format(Math.round(deltaSec / secondsInUnit), unit);
	}

	return rtf.format(0, 'second');
};

// ─── Component ──────────────────────────────────────────────────────────────

export const DateTime: React.FC<DateTimeProps> = ({
	boxProps,
	//
	value,
	format = 'full',
	dir = 'ltr',
	fallback = '-',
}) => {
	// ─── Computed ─────────────────────────────────────────────────────────────

	const date = value === null || value === undefined || value === '' ? null : toDate(value);
	const jalali = date ? DateAPI.gregorianToJalaali(date) : null;

	const text =
		!date || !jalali
			? fallback
			: format === 'relative'
				? relativeText(date)
				: format === 'date'
					? jalali.standardDate
					: format === 'time'
						? jalali.standardTime
						: jalali.standardFullDate;

	const isFallback = text === fallback;
	const isRelative = format === 'relative';

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<time
			{...boxProps}
			dateTime={date ? date.toISOString() : undefined}
			dir={isRelative ? undefined : dir}
			className={cn(!isRelative && 'tabular-nums', isFallback && 'text-text-tertiary', boxProps?.className)}
		>
			{text}
		</time>
	);
};
