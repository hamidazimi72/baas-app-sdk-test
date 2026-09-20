import { cn } from '@/lib/utils';

import { CopyButton } from '../../buttons/copy-button/copy-button';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CodeBlockProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	code: string;
	ltr?: boolean;
	copyable?: boolean;
	wrap?: boolean;
	maxHeight?: string;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const CodeBlock: React.FC<CodeBlockProps> = ({
	boxProps,
	//
	code,
	ltr = true,
	copyable = false,
	wrap = false,
	maxHeight,
}) => {
	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div
			{...boxProps}
			className={cn(
				'group/code relative overflow-hidden rounded-lg border border-divider/20 bg-surface-tertiary',
				boxProps?.className,
			)}
		>
			{copyable && !!code && (
				<CopyButton
					value={code}
					size='sm'
					boxProps={{
						className:
							'absolute inset-e-2 top-2 z-10 rounded-md bg-surface-secondary/80 p-1.5 opacity-0 ring-1 ring-divider/20 backdrop-blur-sm transition-opacity group-hover/code:opacity-100 focus-visible:opacity-100',
					}}
				/>
			)}

			<pre
				className={cn(
					'overflow-auto p-3 text-xs leading-relaxed text-text-primary',
					ltr && 'dir-ltr text-left',
					wrap ? 'whitespace-pre-wrap wrap-break-word' : 'whitespace-pre',
					maxHeight,
				)}
			>
				<code className='font-mono'>{code}</code>
			</pre>
		</div>
	);
};
