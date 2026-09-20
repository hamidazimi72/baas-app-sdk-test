import { Convert } from '../convert/convert';
import { jalaliMonths, jalaliWeekDays } from '../prototypes';

export type JalaliDate = {
	/** `YYYY/MM/DD - HH:mm:ss` */
	standardFullDate: string;
	/** `YYYY/MM/DD` */
	standardDate: string;
	/** `HH:mm:ss` */
	standardTime: string;
	year: string;
	month: string;
	day: string;
	monthName: string;
	dayName: string;
	hours: string;
	minutes: string;
	seconds: string;
	timeStamp: number;
};

const onlyDigits = (value: string): string => value.replace(/\D/g, '');
const pad2 = (value: string): string => onlyDigits(value).padStart(2, '0');

export class DateAPI {
	/**
	 * Format a date for API date-time fields as `YYYY-MM-DDTHH:mm` in local time.
	 * Returns `null` when the input cannot be parsed.
	 */
	static toApiDateTime(input: string | number | Date): string | null {
		const date = new Date(input);
		if (Number.isNaN(date.getTime())) return null;

		const year = String(date.getFullYear()).padStart(4, '0');
		const month = pad2(String(date.getMonth() + 1));
		const day = pad2(String(date.getDate()));
		const hours = pad2(String(date.getHours()));
		const minutes = pad2(String(date.getMinutes()));
		const seconds = pad2(String(date.getSeconds()));

		return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
	}

	/**
	 * Convert a Gregorian date (string / epoch / `Date`) to its Jalali parts,
	 * formatted in the Iran calendar via `Intl` (`fa-IR`). Returns `null` for
	 * an unparseable input.
	 */
	static gregorianToJalaali(input: string | number | Date): JalaliDate | null {
		const date = new Date(input);
		if (Number.isNaN(date.getTime())) return null;

		const jalaliDate = Convert.faDigitToEn(date.toLocaleDateString('fa-IR'));
		const jalaliTime = Convert.faDigitToEn(date.toLocaleTimeString('fa-IR'));

		const [yearPart = '', monthPart = '', dayPart = ''] = jalaliDate.split('/');
		const [hourPart = '', minutePart = '', secondPart = ''] = jalaliTime.split(':');

		const year = onlyDigits(yearPart);
		const month = pad2(monthPart);
		const day = pad2(dayPart);
		const hours = pad2(hourPart);
		const minutes = pad2(minutePart);
		const seconds = pad2(secondPart);

		const standardDate = `${year}/${month}/${day}`;
		const standardTime = `${hours}:${minutes}:${seconds}`;

		return {
			standardFullDate: `${standardDate} - ${standardTime}`,
			standardDate,
			standardTime,
			year,
			month,
			day,
			monthName: jalaliMonths[Number(month)] ?? '',
			dayName: jalaliWeekDays[date.getDay() + 1] ?? '',
			hours,
			minutes,
			seconds,
			timeStamp: date.getTime(),
		};
	}
}
