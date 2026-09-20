import { ImageOff, RefreshCw } from 'lucide-react';

import { ActionIconButton, PrimaryInput } from '@/components/atom';
import { cn } from '@/lib/utils';

export type CaptchaInputProps = {
	boxProps?: React.ComponentProps<'div'>;
	value: string;
	onChange: (value: string) => void;
	onRefresh: () => void;
	image?: string;
	isLoading?: boolean;
	hasError?: boolean;
	isValid?: boolean | null;
	disabled?: boolean;
};

export const CaptchaInput: React.FC<CaptchaInputProps> = ({
	boxProps,
	value,
	onChange,
	onRefresh,
	image,
	isLoading = false,
	hasError = false,
	isValid = null,
	disabled = false,
}) => {
	const unavailable = !image && !isLoading;
	const inputDisabled = disabled || isLoading || !image;

	return (
		<div {...boxProps} className={cn('grid grid-cols-1 items-end gap-3 sm:grid-cols-[auto_1fr]', boxProps?.className)}>
			<div
				className='relative flex h-12 w-36 shrink-0 items-center justify-center overflow-hidden rounded-md border border-divider bg-surface-secondary'
				aria-busy={isLoading}
			>
				{image ? (
					<img
						alt='تصویر کد کپچا'
						className='h-full w-full object-contain'
						decoding='sync'
						loading='eager'
						src={image}
					/>
				) : (
					<ImageOff size={18} className='text-text-tertiary' aria-hidden='true' />
				)}
				{isLoading && (
					<span className='absolute inset-0 animate-pulse bg-surface-primary/60' aria-label='در حال دریافت کپچا' />
				)}
			</div>
			<div className='flex min-w-0 items-center gap-2'>
				<ActionIconButton
					icon={RefreshCw}
					iconProps={{ className: isLoading ? 'animate-spin' : undefined }}
					tone='primary'
					tooltip={hasError ? 'دریافت دوباره کپچا' : 'کپچای جدید'}
					disabled={isLoading || disabled}
					onClick={onRefresh}
				/>
				<PrimaryInput
					boxProps={{ className: 'min-w-0 grow' }}
					label='کد امنیتی'
					placeholder={unavailable ? 'ابتدا کپچا را دریافت کنید' : 'کد تصویر را وارد کنید'}
					value={value}
					onChange={onChange}
					isValid={isValid}
					maxLength={6}
					disabled={inputDisabled}
					required
					ltr
					elProps={{ autoCapitalize: 'characters', spellCheck: false }}
				/>
			</div>
			{hasError && (
				<p className='text-xs text-danger sm:col-span-2' aria-live='polite'>
					دریافت کپچا ناموفق بود؛ دوباره تلاش کنید.
				</p>
			)}
		</div>
	);
};
