import type { ReactNode } from 'react';

import type { PrimaryModalProps } from '@/components/atom';
import { PrimaryModal } from '@/components/atom';
import { cn } from '@/lib/utils';

import { ModalFooter } from '../modal-footer/modal-footer';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ConfirmTone = 'danger' | 'warning' | 'primary' | 'info' | 'success';

export type ConfirmModalProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	header: string;
	message: ReactNode;
	description?: ReactNode;
	icon?: ReactNode;
	tone?: ConfirmTone;
	confirmLabel: string;
	confirmIcon?: ReactNode;
	onConfirm: () => void;
	onClose: () => void;
	loading?: boolean;
	size?: PrimaryModalProps['size'];
};

// ─── Component ──────────────────────────────────────────────────────────────

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
	boxProps,
	//
	header,
	message,
	description,
	icon,
	tone = 'danger',
	confirmLabel,
	confirmIcon,
	onConfirm,
	onClose,
	loading = false,
	size = 'auto',
}) => {
	// ─── Computed ─────────────────────────────────────────────────────────────

	const circleToneMap: Record<ConfirmTone, string> = {
		danger: 'bg-danger/10 text-danger',
		warning: 'bg-warning/10 text-warning',
		primary: 'bg-primary/10 text-primary',
		info: 'bg-info/10 text-info',
		success: 'bg-success/10 text-success',
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<PrimaryModal
			boxProps={boxProps}
			onClose={onClose}
			onCloseDisabled={loading}
			size={size}
			header={
				header
					? () => (
							<div className='px-4'>
								<div className='py-4 border-b border-divider/20 text-xl font-semibold min-h-18 flex items-center'>
									{header}
								</div>
							</div>
						)
					: undefined
			}
			body={() => (
				<div className='flex flex-col items-center gap-3 px-6 py-7 text-center md:min-w-md lg:min-w-lg 2xl:min-w-xl'>
					{icon && (
						<span className={cn('flex size-14 items-center justify-center rounded-full', circleToneMap[tone])}>
							{icon}
						</span>
					)}

					<div className='space-y-1'>
						<div className='text-text-primary'>{message}</div>
						{description && <p className='text-sm text-text-tertiary'>{description}</p>}
					</div>
				</div>
			)}
			footer={(closeHandler) => (
				<ModalFooter
					confirmLabel={confirmLabel}
					confirmIcon={confirmIcon}
					confirmColor={tone}
					confirmType='submit'
					onConfirm={onConfirm}
					loading={loading}
					onCancel={closeHandler}
				/>
			)}
		/>
	);
};
