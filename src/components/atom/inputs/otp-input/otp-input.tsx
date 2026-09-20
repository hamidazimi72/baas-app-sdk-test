import React, { useRef, useState, useEffect } from 'react';

import { cn } from '@/lib/utils';

export type OtpInputProps = {
	children?: React.ReactNode;
	boxProps?: React.ComponentProps<'div'>;
	labelProps?: React.ComponentProps<'div'>;
	elProps?: React.HTMLAttributes<HTMLInputElement | HTMLTextAreaElement>;
	//
	labelColor?: string;
	bgColor?: string;
	disableBgColor?: string;
	textColor?: string;
	disableTextColor?: string;
	placeholderTextColor?: string;
	borderColor?: string;
	fillBorderColor?: string;
	disableBorderColor?: string;
	//
	value?: string | number;
	label?: string;
	//
	onChange?: null | ((value: string, event: any) => any);
	focus?: boolean;
	disabled?: boolean;
	readOnly?: boolean;
	required?: boolean;
	ltr?: boolean;
	isValid?: boolean | null;
	validationMessage?: string | false;
	message?: string | null | React.JSX.Element;
};

export const OtpInput: React.FC<OtpInputProps> = ({
	children,
	boxProps,
	labelProps,
	elProps,
	//label
	labelColor = 'text-text-tertiary',
	// Background Color
	bgColor = 'bg-surface-primary',
	disableBgColor = 'bg-surface-tertiary',
	// Text Color
	textColor = 'text-text-tertiary',
	disableTextColor = 'text-text-cancel',
	placeholderTextColor = 'placeholder:placeholder-cancel',
	// Border Color
	borderColor = 'border-divider/30',
	fillBorderColor = 'border-divider/30',
	disableBorderColor = 'border-divider/30',

	value = '',
	label = '',

	onChange = null,
	focus = false,
	disabled = false,
	readOnly = false,
	required = false,
	ltr,
	// Validation
	isValid = null,
	validationMessage = undefined,
	message = undefined,
}) => {
	const otpLength = 6;
	const [otpValues, setOtpValues] = useState<string[]>(Array(otpLength).fill(''));
	const otpsRef = useRef<HTMLInputElement[]>([]);

	useEffect(() => {
		if (focus) {
			otpsRef.current?.[0]?.focus();
		}
	}, []);

	const onChangeOtpInput = (e, i) => {
		const val = e.target.value ?? '';
		if (!/^\d*$/.test(val)) return;
		if ((e.target.value || '').length > 1) return;

		if (!otpsRef?.current) return;

		const updatedValues = [...otpValues];
		updatedValues[i] = val;
		setOtpValues(updatedValues);
		if (onChange) onChange(updatedValues.join(''), e);

		if (val && i < 5) {
			otpsRef.current[i + 1]?.focus();
		}
	};

	const otpKeyDown = (e, i) => {
		if (e.key === 'Backspace') {
			if (otpValues[i] === '' && i > 0) {
				otpsRef.current[i - 1]?.focus();
			} else {
				const updatedValues = [...otpValues];
				updatedValues[i] = '';
				setOtpValues(updatedValues);
				if (onChange) onChange(updatedValues.join(''), e);
			}
		}
	};

	const onPasteOtp = (e: React.ClipboardEvent<HTMLInputElement>, startIndex: number) => {
		e.preventDefault();

		const clipboardData =
			e.clipboardData.getData('text') || e.clipboardData.getData('text/plain') || e.clipboardData.getData('TEXT') || '';
		const digits = clipboardData.replace(/\D/g, ''); // فقط ارقام
		if (!digits) return;

		const maxLen = otpLength - startIndex;
		const slice = digits.slice(0, maxLen).split('');

		const updated = [...otpValues];
		slice.forEach((d, idx) => {
			updated[startIndex + idx] = d;
		});
		setOtpValues(updated);
		onChange?.(updated.join(''), e);

		const next = startIndex + slice.length;
		if (next < otpLength) {
			otpsRef.current[next]?.focus();
		} else {
			otpsRef.current[otpLength - 1]?.blur();
		}
	};

	const isSuccess = isValid === true && value;
	const isDanger = isValid === false && value;

	const borderColorClass =
		(disabled && disableBorderColor) ||
		(isSuccess && 'border-success') ||
		(isDanger && 'border-danger') ||
		(value && fillBorderColor) ||
		borderColor ||
		'';

	const bgColorClass = (disabled && disableBgColor) || bgColor || '';
	const textColorClass = (disabled && disableTextColor) || textColor || '';
	const labelColorClass = (isDanger && 'text-danger') || labelColor || '';

	return (
		<div {...boxProps} className={cn(boxProps?.className)}>
			<div className='relative'>
				<div {...labelProps} className={cn(labelProps?.className, labelColorClass, 'text-sm min-h-7.5 px-0.5')}>
					{label || ''}
				</div>

				<div className='relative min-h-12.5 min-w-12.5 grow flex flex-row-reverse items-center justify-around gap-2 pt-2 text-sm'>
					{new Array(otpLength).fill(' ').map((item, i) => (
						<div
							key={i}
							className={cn('border rounded-md w-full max-w-18.75', borderColorClass, bgColorClass, textColorClass)}
						>
							<input
								{...elProps}
								type={'number'}
								className={cn(
									'p-1 text-center min-h-12.5 grow w-full',
									elProps?.className,
									'letter-spacing-2',
									ltr && 'dir-ltr text-right',
									'text-base placeholder:text-sm',
									placeholderTextColor,
									'flex border-none outline-none bg-transparent text-inherit text-base',
								)}
								placeholder={''}
								value={otpValues[i] ?? ''}
								onChange={(e) => onChangeOtpInput(e, i)}
								onKeyDown={(e) => otpKeyDown(e, i)}
								onPaste={(e) => onPasteOtp(e, i)}
								ref={(el) => {
									if (el) otpsRef.current[i] = el;
								}}
								disabled={disabled}
								readOnly={readOnly}
								maxLength={1}
								autoComplete={'off'}
							/>
						</div>
					))}
				</div>

				{!message && !disabled && !!validationMessage && (isSuccess || isDanger || required) && (
					<div className='h-6.25 flex items-end text-xs pr-1'>
						{isSuccess && validationMessage && <span className='text-success'>{validationMessage || ''}</span>}
						{isDanger && validationMessage && <span className='text-danger'>{validationMessage || ''}</span>}
					</div>
				)}

				{message && typeof message === 'string' && (
					<div className='h-5 flex items-end text-xs pr-1'>
						{<span className='text-text-tertiary/70'>{message || ''}</span>}
					</div>
				)}

				{message && typeof message !== 'string' && message}

				{children}
			</div>
		</div>
	);
};
