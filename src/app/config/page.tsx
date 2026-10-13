'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import Link from 'next/link';
import { ArrowLeft, Save, Settings } from 'lucide-react';

import { PrimaryButton } from '@/components/atom/buttons';
import { PrimaryInput } from '@/components/atom/inputs';
import { getEnvironmentMbaasConfig, readMbaasConfig, writeMbaasConfig } from '@/sdk/mbaas-config-storage';
import type { MbaasConfig } from '@/sdk/mbaas-config-storage';

type ConfigField = keyof MbaasConfig;

const fields: Array<{ key: ConfigField; label: string; placeholder: string }> = [
	{ key: 'apiKey', label: 'API key', placeholder: 'Enter your API key' },
];

export default function ConfigPage() {
	const [config, setConfig] = useState<MbaasConfig>(getEnvironmentMbaasConfig);
	const [saved, setSaved] = useState(false);

	useEffect(() => setConfig(readMbaasConfig()), []);

	const update = (key: ConfigField, value: string) => {
		setSaved(false);
		setConfig((current) => ({ ...current, [key]: value }));
	};

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const normalizedConfig = { apiKey: config.apiKey.trim() };
		writeMbaasConfig(normalizedConfig);
		setConfig(normalizedConfig);
		setSaved(true);
	};

	return (
		<main className='min-h-screen bg-surface-secondary p-4 md:p-8'>
			<div className='mx-auto max-w-lg'>
				<section className='rounded-xl bg-surface-primary p-4 shadow-sm md:p-8'>
					<div className='flex flex-wrap items-start justify-between gap-4'>
						<div>
							<div className='flex items-center gap-3'>
								<span className='rounded-lg bg-primary/10 p-2 text-primary'>
									<Settings size={22} />
								</span>
								<h1 className='text-2xl font-semibold text-text-primary'>تنظیمات وب اپلیکیشن</h1>
							</div>
							<p className='mt-3 text-sm text-text-secondary'>کلید API مورد استفاده SDK را وارد کنید.</p>
						</div>
						<Link href='/' className='flex items-center gap-2 text-sm text-primary hover:underline'>
							صفحه اصلی
							<ArrowLeft size={16} />
						</Link>
					</div>

					<form onSubmit={submit} className='mt-8 space-y-5'>
						<div className='grid grid-cols-1 gap-6' dir='ltr'>
							{fields.map((field) => (
								<PrimaryInput
									key={field.key}
									label={field.label}
									placeholder={field.placeholder}
									value={config[field.key]}
									onChange={(value) => update(field.key, value)}
									ltr
									required
								/>
							))}
						</div>

						<div className='flex flex-wrap items-center gap-4 border-t border-divider/30 pt-5'>
							<PrimaryButton type='submit' startIcon={<Save size={17} />}>
								ذخیره تنظیمات
							</PrimaryButton>
							{saved && <p className='text-sm text-success'>تنظیمات با موفقیت در مرورگر ذخیره شد.</p>}
						</div>
					</form>
				</section>
			</div>
		</main>
	);
}
