'use client';

import { User2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProfileAvatarProps = {
	boxProps?: React.ComponentProps<'div'>;
	username?: string | null;
	usernameClassName?: string;
	cellphone?: string | null;
	cellphoneClassName?: string;
	hideCellphone?: boolean;
	collapse?: boolean;
};

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
	boxProps,
	username,
	usernameClassName,
	cellphone,
	cellphoneClassName,
	hideCellphone = false,
	collapse = false,
}) => (
	<div
		{...boxProps}
		className={cn('relative flex min-w-0 items-center gap-3', collapse && 'justify-center gap-0', boxProps?.className)}
	>
		<span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-linear-to-br from-secondary/80 to-secondary/20'>
			<User2 size={17} strokeWidth={1.5} className='text-primary' />
		</span>
		{!collapse && (
			<span className='min-w-0'>
				<span className={cn('block truncate text-sm leading-tight text-text-primary', usernameClassName)}>
					{username || '-'}
				</span>
				{!hideCellphone && (
					<span
						className={cn('mt-0.5 block truncate text-xs leading-tight text-text-tertiary', cellphoneClassName)}
						dir='ltr'
					>
						{cellphone ? `0${cellphone}` : '-'}
					</span>
				)}
			</span>
		)}
	</div>
);
