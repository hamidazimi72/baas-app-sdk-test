import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import { images } from '@/assets/images';

// ─── Types ──────────────────────────────────────────────────────────────────

export type LogoProps = {
	boxProps?: Omit<React.ComponentProps<typeof Link>, 'href'>;
	//
	href?: string;
	imageClassName?: string;
	alt?: string;
	priority?: boolean;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const Logo: React.FC<LogoProps> = ({
	boxProps,
	//
	href = '/',
	imageClassName,
	alt = 'logo',
	priority = false,
}) => {
	return (
		<Link
			href={href}
			aria-label='رفتن به صفحه اصلی'
			{...boxProps}
			className={cn('inline-flex items-center transition-opacity duration-200 hover:opacity-80', boxProps?.className)}
		>
			<span className='text-primary-40 font-bold text-2xl min-w-60 min-h-12 text-center'>پنل راهبری</span>
		</Link>
	);
};
