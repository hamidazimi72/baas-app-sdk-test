import { persianDigits } from '../prototypes';

/** Minimal structural shape of a file `<input>` change event (framework-agnostic). */
type FileInputEvent = {
	target: { value?: string; files?: FileList | null };
};

/** Metadata extracted from the selected file. */
export type FileMeta = {
	size: number;
	name: string;
	type: string;
};

export class Convert {
	/** Replace Persian digits with their ASCII equivalents. */
	static faDigitToEn(value: string | number = ''): string {
		return String(value).replace(/[۰-۹]/g, (digit) => persianDigits[digit] ?? digit);
	}

	/**
	 * Group the integer part of a numeric value with a thousands separator
	 * (precision-safe, string based). Non-numeric or empty input is returned unchanged.
	 */
	static addThousandSeparator(value: string | number = '', separator: string = ','): string | number {
		if (value === '' || value === null || value === undefined) return value;

		const str = String(value);
		if (Number.isNaN(Number(str))) return value;

		const negative = str.startsWith('-');
		const unsigned = negative ? str.slice(1) : str;
		const [intPart = '', decPart] = unsigned.split('.');
		const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);

		return (negative ? '-' : '') + grouped + (decPart !== undefined ? '.' + decPart : '');
	}

	/**
	 * Read the first selected file as a data URL and hand back the raw result,
	 * its base64 payload (data-URL prefix stripped), and basic metadata.
	 */
	static fileToBase64(
		event: FileInputEvent,
		callback: (result: string | ArrayBuffer | null, base64: string, meta: FileMeta) => void,
	): void {
		const file = event.target.files?.[0];
		if (!event.target.value || !file) return;

		const reader = new FileReader();
		reader.onloadend = () => {
			const result = reader.result;
			const base64 = typeof result === 'string' ? result.replace(/^data:[a-zA-Z]{2,10}\/[a-z]+;base64,/, '') : '';

			callback(result, base64, { size: file.size, name: file.name, type: file.type });
		};
		reader.readAsDataURL(file);
	}
}
