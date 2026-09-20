import type { ReactNode } from 'react';

import type { ButtonColor, PrimaryModalProps } from '@/components/atom';
import { PrimaryCard, PrimaryModal } from '@/components/atom';
import { cn } from '@/lib/utils';

import { ModalFooter } from '../modal-footer/modal-footer';

// ─── Types ──────────────────────────────────────────────────────────────────

export type FormModalProps = {
	boxProps?: React.ComponentProps<'div'>;
	bodyProps?: React.ComponentProps<'div'>;
	//
	header: string;
	size?: PrimaryModalProps['size'];
	loading?: boolean;
	onClose: () => void;
	children: ReactNode;
	//
	confirmLabel?: string;
	confirmIcon?: ReactNode;
	confirmColor?: ButtonColor;
	onConfirm?: () => void;
	confirmDisabled?: boolean;
	disabledMessage?: string;
	cancelLabel?: string;
	hideFooter?: boolean;
	footerExtra?: ReactNode;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const FormModal: React.FC<FormModalProps> = ({
	boxProps,
	bodyProps,
	//
	header,
	size = 'auto',
	loading = false,
	onClose,
	children,
	//
	confirmLabel = 'تأیید',
	confirmIcon,
	confirmColor = 'primary',
	onConfirm,
	confirmDisabled = false,
	disabledMessage,
	cancelLabel = 'انصراف',
	hideFooter = false,
	footerExtra,
}) => {
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
				<PrimaryCard loading={loading}>
					<div {...bodyProps} className={cn('px-5 py-4 md:min-w-md lg:min-w-lg 2xl:min-w-xl', bodyProps?.className)}>
						{children}
					</div>
				</PrimaryCard>
			)}
			footer={
				hideFooter
					? undefined
					: (closeHandler) => (
							<ModalFooter
								hideConfirm={onConfirm ? false : true}
								confirmLabel={confirmLabel}
								confirmIcon={confirmIcon}
								confirmColor={confirmColor}
								confirmType='submit'
								onConfirm={onConfirm}
								loading={loading}
								disabled={confirmDisabled}
								disabledMessage={disabledMessage}
								hideCancel={cancelLabel ? false : true}
								cancelLabel={cancelLabel}
								onCancel={closeHandler}
								extra={footerExtra}
							/>
						)
			}
		/>
	);
};
