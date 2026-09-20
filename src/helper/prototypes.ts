/**
 * Locale lookup maps (Persian / Jalali) — pure data, no logic.
 * Consumed by `Convert` (digit normalisation) and `DateAPI` (Jalali names).
 */

/** Persian (Eastern Arabic-Indic) digit → ASCII digit. */
export const persianDigits: Record<string, string> = {
	'۰': '0',
	'۱': '1',
	'۲': '2',
	'۳': '3',
	'۴': '4',
	'۵': '5',
	'۶': '6',
	'۷': '7',
	'۸': '8',
	'۹': '9',
};

/** Jalali month number (1–12) → Persian name. */
export const jalaliMonths: Record<number, string> = {
	1: 'فروردین',
	2: 'اردیبهشت',
	3: 'خرداد',
	4: 'تیر',
	5: 'مرداد',
	6: 'شهریور',
	7: 'مهر',
	8: 'آبان',
	9: 'آذر',
	10: 'دی',
	11: 'بهمن',
	12: 'اسفند',
};

/** Week-day index (`Date.getDay() + 1`, 1 = Sunday … 7 = Saturday) → Persian name. */
export const jalaliWeekDays: Record<number, string> = {
	1: 'یکشنبه',
	2: 'دوشنبه',
	3: 'سه‌شنبه',
	4: 'چهار‌شنبه',
	5: 'پنج‌شنبه',
	6: 'جمعه',
	7: 'شنبه',
};
