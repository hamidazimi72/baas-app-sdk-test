import type { ReactNode } from 'react';

import type { ButtonColor } from '@/components/atom';
import { PrimaryButton } from '@/components/atom';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ModalFooterProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	confirmLabel?: string;
	confirmIcon?: ReactNode;
	confirmColor?: ButtonColor;
	confirmType?: 'button' | 'submit';
	onConfirm?: () => void;
	loading?: boolean;
	disabled?: boolean;
	disabledMessage?: string;
	hideConfirm?: boolean;
	cancelLabel?: string;
	onCancel?: () => void;
	hideCancel?: boolean;
	extra?: ReactNode;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const ModalFooter: React.FC<ModalFooterProps> = ({
	boxProps,
	//
	confirmLabel = 'تأیید',
	confirmIcon,
	confirmColor = 'primary',
	confirmType = 'button',
	onConfirm,
	loading = false,
	disabled = false,
	disabledMessage,
	hideConfirm = false,
	cancelLabel = 'انصراف',
	onCancel,
	hideCancel = false,
	extra,
}) => {
	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div {...boxProps} className={cn('flex items-center justify-end gap-2 px-5 py-4', boxProps?.className)}>
			{extra && <div className='me-auto flex items-center gap-2'>{extra}</div>}

			{!hideCancel && (
				<PrimaryButton
					boxProps={{ className: 'min-w-27.5' }}
					variant='ghost'
					color='neutral'
					content={cancelLabel}
					disabled={loading}
					onClick={onCancel}
				/>
			)}

			{!hideConfirm && (
				<PrimaryButton
					boxProps={{ className: 'min-w-37.5' }}
					content={confirmLabel}
					startIcon={confirmIcon}
					type={confirmType}
					color={confirmColor}
					onClick={onConfirm}
					loading={loading}
					disabled={disabled}
					disabledMessage={disabledMessage}
				/>
			)}
		</div>
	);
};
