import { useEffect, useState } from 'react';

import { Convert } from '@/helper';
import { cn } from '@/lib/utils';

export type PrimaryFileUploadProps = {
	boxProps?: React.ComponentProps<'div'>;

	value?: string;
	onChange?: null | ((src: string, data: { name: string | null; size: number | null; type: string | null }) => any);
	onSizeError?: null | (() => any);

	elClass?: string;
	inputId?: string;
	labelClass?: string;
	labelBgColor?: string;
	labelTextColor?: string;
	nameClass?: string;
	labelName?: string;
	accept?: '*' | 'image/*' | 'audio/*' | 'video/*' | 'image/png, image/jpg, image/jpeg' | '';
	maxSize?: number;
};

export const PrimaryUploadFile: React.FC<PrimaryFileUploadProps> = ({
	// box Control
	boxProps,

	value = '',
	onChange = null,
	onSizeError = null,

	elClass = 'flex items-center gap-2',
	inputId = 'primary-file-input',
	labelClass = 'cursor-pointer p-2',
	labelBgColor = 'bg-primary',
	labelTextColor = '',
	nameClass = '',
	labelName = 'انتخاب',
	accept = '*',
	maxSize = 1000000,
}) => {
	const [name, setName] = useState('');

	useEffect(() => {
		if (!value) {
			const element: any = document.getElementById(inputId);
			if (element?.files?.[0]) element.files[0] = '';
		}
	}, [value]);

	const onChangeHandler = (e) => {
		if (!onChange) return;

		Convert.fileToBase64(e, (src: any, base64, { size, type, name }: any) => {
			if (!size) return;

			if (!maxSize || size <= maxSize) {
				setName(name);
				onChange(src, { size, type, name });
			}
			if (maxSize && size > maxSize && onSizeError) onSizeError();
		});
	};

	return (
		<div {...boxProps} className={cn(boxProps?.className)}>
			<div className={cn(elClass)}>
				<label htmlFor={inputId} className={cn(labelClass, labelBgColor, labelTextColor)}>
					{labelName}
				</label>
				<span className={cn(nameClass)}>{value ? name || '' : null}</span>
			</div>
			<input id={inputId} type='file' className='hidden' onChange={onChangeHandler} accept={accept} />
		</div>
	);
};
