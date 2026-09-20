import { cn } from '@/lib/utils';

export type WorkingCalendarTime = {
	dayNo: number;
	fromTime: number;
	toTime: number;
};

export type WorkingCalendarTimeInput = WorkingCalendarTime & {
	calendarTimeId?: string;
};

export type WorkingCalendarTableProps = {
	boxProps?: React.ComponentProps<'div'>;
	//
	value: WorkingCalendarTimeInput[];
	onChange: (value: WorkingCalendarTime[]) => void;
	disabled?: boolean;
};

const days = [
	{ dayNo: 1, label: 'شنبه' },
	{ dayNo: 2, label: 'یکشنبه' },
	{ dayNo: 3, label: 'دوشنبه' },
	{ dayNo: 4, label: 'سه‌شنبه' },
	{ dayNo: 5, label: 'چهارشنبه' },
	{ dayNo: 6, label: 'پنجشنبه' },
	{ dayNo: 7, label: 'جمعه' },
] as const;

const hours = Array.from({ length: 24 }, (_, hour) => hour);

export const WorkingCalendarTable: React.FC<WorkingCalendarTableProps> = ({
	boxProps,
	//
	value,
	onChange,
	disabled = false,
}) => {
	const isChecked = (dayNo: number, hour: number) =>
		value.some((item) => item.dayNo === dayNo && item.fromTime <= hour && item.toTime >= hour + 1);

	const changeHandler = (dayNo: number, hour: number, checked: boolean) => {
		const nextValue: WorkingCalendarTime[] = [];

		for (const day of days) {
			for (const currentHour of hours) {
				const selected = isChecked(day.dayNo, currentHour);
				const nextSelected = day.dayNo === dayNo && currentHour === hour ? checked : selected;

				if (nextSelected) {
					nextValue.push({ dayNo: day.dayNo, fromTime: currentHour, toTime: currentHour + 1 });
				}
			}
		}

		onChange(nextValue);
	};

	return (
		<div {...boxProps} className={cn('w-full overflow-x-auto', boxProps?.className)}>
			<table
				dir='rtl'
				className='w-full min-w-190 table-fixed border-separate border-spacing-0 overflow-hidden rounded-xl border border-divider/20'
			>
				<thead>
					<tr className='bg-surface-secondary/70'>
						<th className='w-24 border-b border-divider/20 px-3 py-3 text-center text-xs font-semibold text-text-tertiary'>
							ساعت
						</th>
						{days.map((day) => (
							<th
								key={day.dayNo}
								className='border-b border-divider/20 px-2 py-3 text-center text-xs font-semibold text-text-tertiary'
							>
								<div>{day.label}</div>
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{hours.map((hour) => (
						<tr key={hour} className='group'>
							<th className='border-b border-divider/10 bg-surface-secondary/30 px-2 py-2 text-center text-xs font-medium tabular-nums text-text-secondary'>
								{hour} - {hour + 1}
							</th>
							{days.map((day) => {
								const checked = isChecked(day.dayNo, hour);

								return (
									<td key={day.dayNo} className='border-b border-r border-divider/10 p-1.5 text-center'>
										<label
											className={cn(
												'flex min-h-8 cursor-pointer items-center justify-center rounded-lg border transition-colors',
												checked
													? 'border-primary/30 bg-primary/10'
													: 'border-transparent hover:border-divider/30 hover:bg-surface-secondary',
												disabled && 'pointer-events-none',
											)}
										>
											{!disabled && (
												<input
													type='checkbox'
													checked={checked}
													// disabled={disabled}
													onChange={(event) => changeHandler(day.dayNo, hour, event.target.checked)}
													aria-label={`${day.label}، ساعت ${hour} تا ${hour + 1}`}
													className='size-4 accent-primary'
												/>
											)}

											{disabled && checked && (
												<span>
													{hour} - {hour + 1}
												</span>
											)}
										</label>
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};
