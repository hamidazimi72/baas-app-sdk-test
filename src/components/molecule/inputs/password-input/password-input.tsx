'use client';

import { useState } from 'react';

import { Eye, EyeOff } from 'lucide-react';

import type { PrimaryInputProps } from '@/components/atom';
import { PrimaryInput } from '@/components/atom';

// ─── Types ──────────────────────────────────────────────────────────────────

export type PasswordInputProps = Omit<PrimaryInputProps, 'type' | 'suffix'>;

// ─── Component ──────────────────────────────────────────────────────────────

export const PasswordInput: React.FC<PasswordInputProps> = (props) => {
	// ─── State ────────────────────────────────────────────────────────────────

	const [show, setShow] = useState(false);

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<PrimaryInput
			{...props}
			type={show ? 'text' : 'password'}
			suffix={() => (
				<button
					type='button'
					onClick={() => setShow((s) => !s)}
					aria-label={show ? 'پنهان کردن رمز' : 'نمایش رمز'}
					className='cursor-pointer text-text-tertiary transition-colors hover:text-text-primary'
				>
					{show ? <EyeOff size={18} /> : <Eye size={18} />}
				</button>
			)}
		/>
	);
};
