'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export type ToggleThemeButtonProps = {
	boxProps?: React.ComponentProps<'div'>;
};

export const ToggleThemeButton: React.FC<ToggleThemeButtonProps> = ({ boxProps }) => {
	const { setTheme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<div
				className={cn(
					'inline-flex w-16 h-9 rounded-full bg-slate-100 dark:bg-slate-800/50 animate-pulse',
					boxProps?.className,
				)}
			/>
		);
	}

	const isDark = resolvedTheme === 'dark';

	const toggleHandler = () => {
		setTheme(isDark ? 'light' : 'dark');
	};

	return (
		<div {...boxProps} className={cn('inline-flex select-none', boxProps?.className)}>
			<button
				type='button'
				aria-label='تغییر پوسته'
				onClick={toggleHandler}
				className={cn(
					'relative flex items-center p-0.5 w-16 h-8 rounded-xl border border-divider/30 bg-surface-primary cursor-pointer transition-colors duration-300 outline-none',
				)}
			>
				<div
					className={cn(
						'absolute top-1 bottom-1 left-1 w-6 h-6 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] shadow-sm',

						isDark ? 'translate-x-7.5 bg-primary/50' : 'translate-x-0 bg-primary/5',
					)}
				/>

				<div className='relative z-10 flex w-full h-full justify-between items-center'>
					{/* Right Icon Slot (Moon) */}
					<div className='flex items-center justify-center w-7 h-7'>
						<Moon
							size={15}
							className={cn(
								'transition-all duration-300',
								isDark ? 'text-primary scale-110 font-bold' : 'text-text-tertiary scale-90',
							)}
						/>
					</div>

					{/* Left Icon Slot (Sun) */}
					<div className='flex items-center justify-center w-7 h-7'>
						<Sun
							size={16}
							className={cn(
								'transition-all duration-300',
								isDark ? 'text-text-tertiary scale-90' : 'text-secondary-60 dark:text-secondary scale-110 font-bold',
							)}
						/>
					</div>
				</div>
			</button>
		</div>
	);
};
