import { CodeBlock } from '../code-block/code-block';

// ─── Types ──────────────────────────────────────────────────────────────────

export type JsonViewerProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	data: unknown;
	copyable?: boolean;
	wrap?: boolean;
	maxHeight?: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const stringify = (data: unknown): string => {
	if (typeof data === 'string') return data;
	try {
		return JSON.stringify(data, null, 2);
	} catch {
		return String(data);
	}
};

// ─── Component ──────────────────────────────────────────────────────────────

export const JsonViewer: React.FC<JsonViewerProps> = ({
	boxProps,
	//
	data,
	copyable = true,
	wrap = false,
	maxHeight = 'max-h-72',
}) => {
	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<CodeBlock boxProps={boxProps} code={stringify(data)} ltr copyable={copyable} wrap={wrap} maxHeight={maxHeight} />
	);
};
