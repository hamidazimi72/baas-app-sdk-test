import React, { useEffect, useRef, useState } from 'react';

import { Convert } from '@/helper';
import { cn } from '@/lib/utils';

export type PrimaryInputProps = {
	children?: React.ReactNode;
	boxProps?: React.ComponentProps<'div'>;
	labelProps?: React.ComponentProps<'div'>;
	elProps?: React.HTMLAttributes<HTMLInputElement | HTMLTextAreaElement>;
	//
	bgColor?: string;
	disableBgColor?: string;
	textColor?: string;
	disableTextColor?: string;
	placeholderTextColor?: string;
	borderColor?: string;
	focusBorderColor?: string;
	fillBorderColor?: string;
	disableBorderColor?: string;
	//
	textarea?: boolean;
	rows?: number | undefined;
	cols?: number | undefined;
	type?: 'text' | 'password';
	value?: string | number;
	placeholder?: string;
	caption?: string;
	label?: string;
	numeric?: boolean;
	priceMode?: boolean;
	otpMode?: boolean;
	autoComplete?: boolean;
	//
	prefix?: string | (() => any) | React.JSX.Element;
	suffix?: string | (() => any) | React.JSX.Element;
	//
	onChange?: null | ((value: string, event: any) => any);
	focus?: boolean;
	disabled?: boolean;
	readOnly?: boolean;
	required?: boolean;
	maxLength?: number | undefined;
	ltr?: boolean;
	onFocus?: null | ((e?: any) => any);
	onBlur?: null | ((e?: any) => any);
	isValid?: boolean | null;
	validationMessage?: string | false;
	message?: string | null | React.JSX.Element;
};

export const PrimaryInput: React.FC<PrimaryInputProps> = ({
	children,
	boxProps,
	labelProps,
	elProps,
	// Background Color
	bgColor = 'bg-surface-primary',
	disableBgColor = 'bg-surface-tertiary',
	// Text Color
	textColor = 'text-text-tertiary',
	disableTextColor = 'text-text-cancel',
	placeholderTextColor = 'placeholder:placeholder-cancel',
	// Border Color
	borderColor = 'border-divider/30',
	focusBorderColor = 'border-divider/30',
	fillBorderColor = 'border-divider/30',
	disableBorderColor = 'border-divider/30',

	textarea = false,
	rows = 2,
	cols = 2,
	type = 'text',
	value = '',
	placeholder = '',
	caption = '',
	label = '',

	numeric = false,
	priceMode = false,
	otpMode = false,
	autoComplete = false,

	prefix,
	suffix,

	onChange = null,
	focus = false,
	disabled = false,
	readOnly = false,
	required = false,
	maxLength = undefined,
	ltr,
	onFocus = null,
	onBlur = null,
	// Validation
	isValid = null,
	validationMessage = undefined,
	message = undefined,
}) => {
	//
	const rf: any = useRef(null);

	const [isFocus, setFocus] = useState(false);

	const onFocusHandler = (e) => {
		setFocus(true);
		onFocus && onFocus(e);
	};

	const onBlurHandler = (e) => {
		setFocus(false);
		onBlur && onBlur(e);
	};

	useEffect(() => {
		if (focus) {
			rf.current.focus();
		}
	}, []);

	const changeInput = (e) => {
		if (priceMode) e.target.value = e.target.value.replaceAll(',', '');
		if ((numeric || priceMode || otpMode) && isNaN(e.target.value)) return;
		if (onChange) onChange(e.target.value || '', e);
	};

	const isSuccess = isValid === true && value;
	const isDanger = isValid === false && value;

	const borderColorClass =
		(disabled && disableBorderColor) ||
		(isSuccess && 'border-success') ||
		(isDanger && 'border-danger') ||
		(isFocus && focusBorderColor) ||
		(value && fillBorderColor) ||
		borderColor ||
		'';

	const bgColorClass = (disabled && disableBgColor) || bgColor || '';
	const textColorClass = (disabled && disableTextColor) || textColor || '';

	const formattedValue = (priceMode && Convert.addThousandSeparator(value)) || value || '';

	const modeClass = (otpMode && 'letter-spacing-2') || ((numeric || priceMode || otpMode) && 'dir-X') || '';

	// Floating label — rests like a placeholder, lifts onto the border when focused or filled.
	const hasValue = value !== '' && value !== null && value !== undefined;
	const isFloated = isFocus || hasValue;
	// Show the real placeholder hint only once the label has floated away (otherwise the label covers it).
	const effectivePlaceholder = label ? (isFloated ? placeholder : '') : placeholder;

	return (
		<div {...boxProps} className={cn(boxProps?.className)}>
			{caption && <div className='text-md font-medium text-text-tertiary mb-2'>{caption}</div>}

			<div
				className={cn(
					'relative flex items-center gap-2 w-full border rounded-md text-sm transition-[border-color,box-shadow,background-color] duration-200 ease-premium',
					isFocus ? 'ring-2 ring-primary/15' : 'ring-0 ring-transparent',
					borderColorClass,
					bgColorClass,
					textColorClass,
				)}
			>
				{!!label && (
					<div
						{...labelProps}
						className={cn(
							'pointer-events-none absolute z-10 leading-none transition-all duration-200 ease-premium',
							isFloated
								? `-top-0.75 right-3 -translate-y-1/2 text-sm px-2 text-text-tertiary bg-linear-to-b from-transparent from-50% ${disabled ? 'to-surface-tertiary' : 'to-surface-primary'} to-50%`
								: cn('top-1/2 -translate-y-1/2 text-sm text-text-tertiary/70', prefix ? 'right-12' : 'right-3'),
							labelProps?.className,
						)}
					>
						{label}
					</div>
				)}

				{!!prefix && (
					<span
						className={cn(
							'min-w-10 min-h-7.5 text-text-tertiary-80 text-sm',
							typeof prefix === 'function' ? '' : 'border-l border-divider/30',
							'h-[full] flex items-center justify-center',
						)}
					>
						{typeof prefix === 'function' ? prefix() : prefix}
					</span>
				)}

				{textarea ? (
					<textarea
						{...elProps}
						ref={rf}
						className={cn(
							'p-3 min-h-8.75 grow w-full',
							elProps?.className,
							modeClass,
							ltr && 'dir-ltr text-right',
							'placeholder:text-sm placeholder:font-light',
							placeholderTextColor,
							'resize-none flex border-none outline-none bg-transparent text-inherit',
						)}
						placeholder={effectivePlaceholder}
						value={formattedValue}
						rows={rows}
						cols={cols}
						onChange={changeInput}
						disabled={disabled}
						readOnly={readOnly}
						onFocus={onFocusHandler}
						onBlur={onBlurHandler}
						maxLength={otpMode ? 6 : maxLength}
						autoComplete={autoComplete ? 'on' : 'off'}
					/>
				) : (
					<input
						{...elProps}
						type={type}
						ref={rf}
						className={cn(
							'p-3 min-h-8.75 grow w-full',
							elProps?.className,
							modeClass,
							ltr && 'dir-ltr text-right',
							'placeholder:text-sm placeholder:font-light',
							placeholderTextColor,
							'flex border-none outline-none bg-transparent text-inherit',
						)}
						placeholder={effectivePlaceholder}
						value={formattedValue}
						onChange={changeInput}
						disabled={disabled}
						readOnly={readOnly}
						onFocus={onFocusHandler}
						onBlur={onBlurHandler}
						maxLength={otpMode ? 6 : maxLength}
						autoComplete={autoComplete ? 'on' : 'off'}
					/>
				)}

				{required && <span className='absolute top-1 left-1 text-danger text-base'>*</span>}

				{!!suffix && (
					<span className='min-w-10 min-h-7.5 text-text-tertiary-80 text-sm h-[full] flex items-center justify-center'>
						{typeof suffix === 'function' ? suffix() : suffix}
					</span>
				)}
			</div>

			{!message && !disabled && !!validationMessage && (isSuccess || isDanger) && (
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
	);
};
