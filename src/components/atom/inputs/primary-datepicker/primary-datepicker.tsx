import { useState } from 'react';

import moment from 'jalali-moment';

import type { PrimaryInputProps } from '@/components/atom';
import { PrimaryCalendar, PrimaryInput, PrimaryModal } from '@/components/atom';

export type PrimaryDatepickerProps = PrimaryInputProps & {
	value?: string;
	jalaaliInput?: boolean;
	geoCalendar?: boolean;
};

export const PrimaryDatepicker: React.FC<PrimaryDatepickerProps> = ({
	//
	boxProps,
	elProps,
	jalaaliInput,
	geoCalendar,

	value,
	onChange,

	...props
}) => {
	const [showCalendar, setShowCalendar] = useState(false);

	const isValidDate = !jalaaliInput ? Date.parse(value || '') : /^\d{4}[/-]{1}\d{2}[/-]{1}\d{2}/.test(value || '');

	const valueISO =
		jalaaliInput && !geoCalendar
			? isValidDate && moment(value, 'jYYYY/jMM/jDD')
				? moment(value, 'jYYYY/jMM/jDD')?.toISOString() || ''
				: ''
			: isValidDate
				? new Date(value || '')?.toISOString() || ''
				: '';

	const displayValue = geoCalendar
		? valueISO || ''
		: valueISO
			? moment(valueISO).locale('fa').format('YYYY/MM/DD')
			: '';

	return (
		<>
			<PrimaryInput
				{...props}
				value={displayValue}
				boxProps={{
					className: `${boxProps?.className || ''} cursor-pointer`,
					onClick: () => setShowCalendar(true),
				}}
				elProps={{ ...elProps, className: `${elProps?.className || ''} pointer-events-none` }}
				readOnly
			/>

			{showCalendar && (
				<PrimaryModal
					onClose={() => setShowCalendar(false)}
					size='sm'
					hideCloseIcon
					body={(onClose) => (
						<PrimaryCalendar
							boxProps={{ className: 'p-2' }}
							value={valueISO}
							onChange={(geo, jalaali) => {
								if (onChange) onChange(jalaaliInput ? jalaali : geo, null);
								onClose();
							}}
						/>
					)}
				></PrimaryModal>
			)}
		</>
	);
};
