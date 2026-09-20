export class ClipboardApi {
	/** Copy `text` to the clipboard. Resolves `true` on success, `false` on failure. */
	static async writeText(text: string): Promise<boolean> {
		if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
			try {
				await navigator.clipboard.writeText(text);
				return true;
			} catch {
				// Permission denied or insecure context — fall back to execCommand.
			}
		}

		return ClipboardApi.legacyCopy(text);
	}

	/** Legacy `execCommand('copy')` fallback for browsers without the async Clipboard API. */
	private static legacyCopy(text: string): boolean {
		try {
			const textarea = document.createElement('textarea');
			textarea.value = text;
			textarea.className = 'opacity-0';
			document.body.appendChild(textarea);
			textarea.select();

			const copied = document.execCommand('copy');
			textarea.remove();

			return copied;
		} catch {
			return false;
		}
	}
}
