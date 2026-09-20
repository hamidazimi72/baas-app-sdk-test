'use client';

import { useState } from 'react';

import { Check, Copy } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { motionPresets } from '@/lib';
import { cn } from '@/lib/utils';
import { ClipboardApi } from '@/helper';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CopyButtonSize = 'sm' | 'md' | 'lg';

export type CopyButtonProps = {
	boxProps?: React.ComponentProps<'button'>;
	//
	value: string;
	size?: CopyButtonSize;
	label?: string;
	copiedLabel?: string;
	title?: string;
	onCopied?: (value: string) => void;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const CopyButton: React.FC<CopyButtonProps> = ({
	boxProps,
	//
	value,
	size = 'md',
	label,
	copiedLabel = 'کپی شد',
	title = 'کپی',
	onCopied,
}) => {
	// ─── State ────────────────────────────────────────────────────────────────

	const [copied, setCopied] = useState(false);

	// ─── Computed ─────────────────────────────────────────────────────────────

	const iconSizeMap: Record<CopyButtonSize, number> = { sm: 14, md: 16, lg: 18 };
	const boxSizeMap: Record<CopyButtonSize, string> = { sm: 'size-3.5', md: 'size-4', lg: 'size-4.5' };
	const iconSize = iconSizeMap[size];

	// ─── Handlers ─────────────────────────────────────────────────────────────

	const copyHandler = async () => {
		if (!value) return;
		const ok = await ClipboardApi.writeText(value);
		if (!ok) return;
		setCopied(true);
		onCopied?.(value);
		setTimeout(() => setCopied(false), 1800);
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<button
			{...boxProps}
			type='button'
			onClick={copyHandler}
			title={title}
			aria-label={title}
			className={cn(
				'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md text-text-tertiary transition-colors',
				'hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
				label && 'px-2 py-1 text-xs',
				boxProps?.className,
			)}
		>
			<span className={cn('relative inline-flex items-center justify-center', boxSizeMap[size])}>
				<AnimatePresence mode='wait' initial={false}>
					<motion.span
						key={copied ? 'check' : 'copy'}
						className='absolute inset-0 inline-flex items-center justify-center'
						initial={{ opacity: 0, scale: 0.6 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.6 }}
						transition={{ duration: motionPresets.DURATION.fast, ease: motionPresets.EASE_BACK }}
					>
						{copied ? <Check size={iconSize} className='text-success' /> : <Copy size={iconSize} />}
					</motion.span>
				</AnimatePresence>
			</span>
			{label && <span>{copied ? copiedLabel : label}</span>}
		</button>
	);
};
