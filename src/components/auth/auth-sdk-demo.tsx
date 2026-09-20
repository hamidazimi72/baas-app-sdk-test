'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { AuthSdk, CoreSdk } from 'new-sdk';
import { PrimaryButton } from '@/components/atom/buttons';
import { PrimaryInput } from '@/components/atom/inputs';
import { PrimarySelect } from '@/components/atom/selects';
import { useMbaasSdk } from '@/sdk';

type Mode = 'register' | 'login' | 'recovery' | 'profile' | 'device' | 'convert' | 'logout';
type Method = 'email' | 'phone' | 'google' | 'myGov' | 'anonymous';
type Step = 'credentials' | 'otp';
type FormState = {
	email: string;
	phone: string;
	password: string;
	code: string;
	tokenId: string;
	firstName: string;
	lastName: string;
	gender: string;
	birthDate: string;
	province: string;
	city: string;
	address: string;
	redirectUri: string;
	userId: string;
	region: string;
	age: string;
};

const googleClientId = '1083823337502-k9e8dgudvgjsdjtb0dl4oolcfmevuulg.apps.googleusercontent.com';
const googleClientSecret = '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';
const initialForm: FormState = {
	email: '',
	phone: '',
	password: '',
	code: '',
	tokenId: '',
	firstName: '',
	lastName: '',
	gender: '',
	birthDate: '',
	province: '',
	city: '',
	address: '',
	redirectUri: '',
	userId: '',
	region: '',
	age: '',
};
const getInitialForm = (): FormState => ({
	...initialForm,
	redirectUri: typeof window === 'undefined' ? '' : window.location.origin,
});
const modeLabels: Record<Mode, string> = {
	register: 'ثبت‌نام',
	login: 'ورود',
	recovery: 'بازیابی رمز عبور',
	profile: 'پروفایل و توکن‌ها',
	device: 'ویرایش اطلاعات دستگاه',
	convert: 'تبدیل کاربر ناشناس',
	logout: 'خروج',
};
const modeOptions = Object.entries(modeLabels)
	.filter(([value]) => value !== 'logout')
	.map(([value, name]) => ({ value, name }));
const methodOptions: Record<'register' | 'login', { value: Method; name: string }[]> = {
	register: [
		{ value: 'email', name: 'با ایمیل' },
		{ value: 'phone', name: 'با موبایل' },
	],
	login: [
		{ value: 'email', name: 'با ایمیل' },
		{ value: 'phone', name: 'با موبایل' },
		{ value: 'google', name: 'با Google' },
		{ value: 'myGov', name: 'با دولت من' },
		{ value: 'anonymous', name: 'ورود ناشناس' },
	],
};
const genderOptions = [
	{ value: '', name: 'انتخاب کنید' },
	{ value: 'female', name: 'زن' },
	{ value: 'male', name: 'مرد' },
];
const isSuccess = (value: unknown) =>
	!value || typeof value !== 'object' || !('success' in value) || Boolean((value as { success?: unknown }).success);
const serializeError = (error: unknown) => {
	if (!(error instanceof Error)) return error;
	const value = error as Error & { body?: unknown; status?: number; code?: string };
	return {
		name: error.name,
		message: error.message,
		...(value.status ? { status: value.status } : {}),
		...(value.code ? { code: value.code } : {}),
		...(value.body !== undefined ? { body: value.body } : {}),
	};
};
const extractUserId = (value: unknown) => {
	if (!value || typeof value !== 'object' || !('data' in value)) return null;
	const data = (value as { data?: unknown }).data;
	if (!data || typeof data !== 'object' || !('userId' in data)) return null;
	const userId = (data as { userId?: unknown }).userId;
	return typeof userId === 'string' && userId ? userId : null;
};
const profileFormKeys = ['firstName', 'lastName', 'gender', 'birthDate', 'province', 'city', 'address'] as const;
type ProfileFormKey = (typeof profileFormKeys)[number];
const extractProfileFormValues = (value: unknown): Partial<Pick<FormState, ProfileFormKey>> => {
	if (!value || typeof value !== 'object') return {};

	const source = value as Record<string, unknown>;
	return profileFormKeys.reduce<Partial<Pick<FormState, ProfileFormKey>>>((fields, key) => {
		if (key in source) {
			const fieldValue = source[key];
			if (key === 'gender' && (fieldValue === 'M' || fieldValue === 'F')) {
				fields[key] = fieldValue === 'M' ? 'male' : 'female';
			} else {
				fields[key] = fieldValue === null || fieldValue === undefined ? '' : String(fieldValue);
			}
		}
		return fields;
	}, {});
};

export function AuthSdkDemo() {
	const { core, auth, analytics, isConfigured, isInitialized, initializationError } = useMbaasSdk();
	const [mode, setMode] = useState<Mode>('register');
	const [method, setMethod] = useState<Method>('email');
	const [step, setStep] = useState<Step>('credentials');
	const [form, setForm] = useState<FormState>(initialForm);
	const [authenticatedUserId, setAuthenticatedUserId] = useState('');
	const [response, setResponse] = useState<unknown>(null);
	const [loading, setLoading] = useState(false);
	const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
	useEffect(() => {
		setForm((current) => (current.redirectUri ? current : { ...current, redirectUri: window.location.origin }));
		if (!('Notification' in window)) alert('Notification no exist in window 1');
		if ('Notification' in window) {
			// alert(Notification.permission);
			setNotificationPermission(Notification.permission);
		}
	}, []);
	const requestNotificationPermission = async () => {
		if (!('Notification' in window)) alert('Notification no exist in window 2');
		const permission = await Notification.requestPermission();
		setNotificationPermission(permission);
	};
	const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));
	const applyProfileResponse = (value: unknown) => {
		if (!isSuccess(value) || !value || typeof value !== 'object' || !('data' in value)) return;
		const profileValues = extractProfileFormValues((value as { data?: unknown }).data);
		setForm((current) => ({ ...current, ...profileValues }));
	};
	const resetForm = () => {
		setForm(getInitialForm());
		setStep('credentials');
	};
	const execute = async (
		operation: (sdk: AuthSdk) => Promise<unknown>,
		clearOnSuccess = false,
		eventName?: string,
		eventParams?: Record<string, string | number | boolean>,
		onSuccess?: (result: unknown) => void,
	) => {
		if (!auth) {
			setResponse({ success: false, message: 'Auth SDK آماده نیست.' });
			return false;
		}
		setLoading(true);
		try {
			const result = await operation(auth);
			setResponse(result);
			const ok = isSuccess(result);
			const userId = extractUserId(result);
			if (ok && userId) setAuthenticatedUserId(userId);
			if (ok) onSuccess?.(result);
			if (ok && eventName && analytics) {
				try {
					await analytics.logEvent(`EVENT_${eventName}`, eventParams);
				} catch {
					// Analytics failure must not turn a successful Auth operation into a failure.
				}
			}
			if (ok && clearOnSuccess) resetForm();
			return ok;
		} catch (error) {
			setResponse({ success: false, error: serializeError(error) });
			return false;
		} finally {
			setLoading(false);
		}
	};
	const logout = async () => {
		const ok = await execute((sdk) => sdk.logout(), true, 'logout');
		if (ok) setAuthenticatedUserId('');
	};
	const executeCore = async (operation: (sdk: CoreSdk) => Promise<unknown>, clearOnSuccess = false) => {
		if (!core) {
			setResponse({ success: false, message: 'Core SDK آماده نیست.' });
			return false;
		}
		setLoading(true);
		try {
			const result = await operation(core);
			setResponse(result);
			const ok = isSuccess(result);
			const userId = extractUserId(result);
			if (ok && userId) setAuthenticatedUserId(userId);
			if (ok && clearOnSuccess) resetForm();
			return ok;
		} catch (error) {
			setResponse({ success: false, error: serializeError(error) });
			return false;
		} finally {
			setLoading(false);
		}
	};
	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (mode === 'device') {
			const devicePayload = {
				...(form.userId ? { userId: form.userId } : {}),
				...(form.gender ? { gender: form.gender } : {}),
				...(form.region ? { region: form.region } : {}),
				...(form.age ? { age: Number(form.age) } : {}),
			};
			await executeCore((sdk) => sdk.deviceUpdate(devicePayload), true);
			return;
		}
		if (mode === 'profile') {
			const profilePayload = {
				...(form.firstName ? { firstName: form.firstName } : {}),
				...(form.lastName ? { lastName: form.lastName } : {}),
				...(form.gender === 'male' || form.gender === 'female' ? { gender: form.gender } : {}),
				...(form.birthDate ? { birthDate: form.birthDate } : {}),
				...(form.province ? { province: form.province } : {}),
				...(form.city ? { city: form.city } : {}),
				...(form.address ? { address: form.address } : {}),
			};
			await execute(
				(sdk) => sdk.updateUser(profilePayload as Parameters<AuthSdk['updateUser']>[0]),
				false,
				'updateUser',
				profilePayload,
				applyProfileResponse,
			);
			return;
		}
		if (mode === 'logout') {
			await logout();
			return;
		}
		if (mode === 'convert') {
			if (step === 'credentials') {
				if (
					await execute(
						(sdk) => sdk.convertUserByEmailSendOtp({ email: form.email }),
						false,
						'convertUserByEmailSendOtp',
						{ email: form.email },
					)
				)
					setStep('otp');
			} else if (
				await execute(
					(sdk) => sdk.convertUserByEmailVerifyOtp({ email: form.email, password: form.password, code: form.code }),
					true,
					'convertUserByEmailVerifyOtp',
					{ email: form.email, password: form.password, code: form.code },
				)
			)
				resetForm();
			return;
		}
		if (mode === 'recovery') {
			if (step === 'credentials') {
				if (
					await execute((sdk) => sdk.resetPasswordSendOtp({ email: form.email }), false, 'resetPasswordSendOtp', {
						email: form.email,
					})
				)
					setStep('otp');
			} else if (
				await execute(
					(sdk) => sdk.resetPasswordVerifyOtp({ email: form.email, password: form.password, code: form.code }),
					true,
					'resetPasswordVerifyOtp',
					{ email: form.email, password: form.password, code: form.code },
				)
			)
				resetForm();
			return;
		}
		if (mode === 'login' && method === 'anonymous') {
			await execute((sdk) => sdk.loginAnonymous({}), true, 'loginAnonymous');
			return;
		}
		if (mode === 'register' && method === 'email') {
			if (step === 'credentials') {
				if (
					await execute((sdk) => sdk.registerEmailSendOtp({ email: form.email }), false, 'registerEmailSendOtp', {
						email: form.email,
					})
				)
					setStep('otp');
			} else if (
				await execute(
					(sdk) => sdk.registerEmailVerifyOtp({ email: form.email, code: form.code, password: form.password }),
					true,
					'registerEmailVerifyOtp',
					{ email: form.email, code: form.code, password: form.password },
				)
			)
				resetForm();
			return;
		}
		if (mode === 'register' && method === 'phone') {
			if (step === 'credentials') {
				if (
					await execute((sdk) => sdk.registerPhoneSendOtp({ phone: form.phone }), false, 'registerPhoneSendOtp', {
						phone: form.phone,
					})
				)
					setStep('otp');
			} else if (
				await execute(
					(sdk) => sdk.registerPhoneVerifyOtp({ phone: form.phone, code: form.code }),
					true,
					'registerPhoneVerifyOtp',
					{ phone: form.phone, code: form.code },
				)
			)
				resetForm();
			return;
		}
		if (mode === 'login' && method === 'email') {
			if (step === 'credentials') {
				if (
					await execute(
						(sdk) => sdk.loginEmailSendOtp({ email: form.email, password: form.password }),
						false,
						'loginEmailSendOtp',
						{ email: form.email, password: form.password },
					)
				)
					setStep('otp');
			} else if (
				await execute(
					(sdk) => sdk.loginEmailVerifyOtp({ email: form.email, code: form.code, password: form.password }),
					true,
					'loginEmailVerifyOtp',
					{ email: form.email, code: form.code, password: form.password },
				)
			)
				resetForm();
			return;
		}
		if (mode === 'login' && method === 'phone') {
			if (step === 'credentials') {
				if (
					await execute((sdk) => sdk.loginPhoneSendOtp({ phone: form.phone }), false, 'loginPhoneSendOtp', {
						phone: form.phone,
					})
				)
					setStep('otp');
			} else if (
				await execute(
					(sdk) => sdk.loginPhoneVerifyOtp({ phone: form.phone, code: form.code }),
					true,
					'loginPhoneVerifyOtp',
					{ phone: form.phone, code: form.code },
				)
			)
				resetForm();
		}
	};
	const startOAuth = (provider: 'google' | 'myGov') => {
		if (!auth) return;
		try {
			if (provider === 'google') auth.signInWithGoogle(googleClientId, form.redirectUri);
			else auth.signInWithMyGov(form.redirectUri);
		} catch (error) {
			setResponse({ success: false, error: serializeError(error) });
		}
	};
	const completeOAuth = (provider: 'google' | 'myGov') =>
		execute(
			(sdk) =>
				provider === 'google'
					? sdk.handleGoogleCallback(googleClientId, googleClientSecret, form.redirectUri)
					: sdk.handleMyGovCallback(),
			true,
			provider === 'google' ? 'handleGoogleCallback' : 'handleMyGovCallback',
			{ ...(provider === 'google' ? { clientId: googleClientId } : {}), redirectUri: form.redirectUri },
		);
	const fetchUser = async () => {
		if (!auth) return;
		setLoading(true);
		try {
			const result = await auth.fetchUser();
			setResponse(result);
			applyProfileResponse(result);
		} catch (error) {
			setResponse({ success: false, error: serializeError(error) });
		} finally {
			setLoading(false);
		}
	};
	const changeMode = (value: Mode) => {
		setMode(value);
		setStep('credentials');
		setResponse(null);
		if (value !== 'profile') {
			resetForm();
			if (value === 'device' && authenticatedUserId) {
				setForm((current) => ({ ...current, userId: authenticatedUserId }));
			}
		}
	};
	const changeMethod = (value: Method) => {
		setMethod(value);
		setStep('credentials');
		setResponse(null);
		resetForm();
	};
	const profileFields = (
		<div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
			<PrimaryInput
				boxProps={{ className: 'col-span-1' }}
				label='نام'
				value={form.firstName}
				onChange={(v) => update('firstName', v)}
			/>
			<PrimaryInput
				boxProps={{ className: 'col-span-1' }}
				label='نام خانوادگی'
				value={form.lastName}
				onChange={(v) => update('lastName', v)}
			/>
			<PrimaryInput
				boxProps={{ className: 'col-span-1' }}
				label='تاریخ تولد'
				placeholder='yyyy/mm/dd'
				value={form.birthDate}
				onChange={(v) => update('birthDate', v)}
			/>
			<PrimarySelect
				boxProps={{ className: 'col-span-1' }}
				label='جنسیت'
				value={form.gender}
				options={genderOptions}
				onChange={(item) => update('gender', item?.value ?? '')}
			/>
			<PrimaryInput
				boxProps={{ className: 'col-span-1' }}
				label='استان'
				value={form.province}
				onChange={(v) => update('province', v)}
			/>
			<PrimaryInput
				boxProps={{ className: 'col-span-1' }}
				label='شهر'
				value={form.city}
				onChange={(v) => update('city', v)}
			/>
			<PrimaryInput
				boxProps={{ className: 'col-span-1 lg:col-span-2' }}
				label='آدرس'
				value={form.address}
				onChange={(v) => update('address', v)}
				textarea
				rows={2}
			/>
		</div>
	);
	const deviceFields = (
		<div className='grid grid-cols-1 gap-4'>
			<PrimaryInput label='شناسه کاربر' value={form.userId} onChange={(v) => update('userId', v)} ltr />
			<PrimaryInput label='منطقه' value={form.region} onChange={(v) => update('region', v)} />
			<PrimaryInput label='جنسیت' value={form.gender} onChange={(v) => update('gender', v)} />
			<PrimaryInput label='سن' value={form.age} onChange={(v) => update('age', v)} numeric />
		</div>
	);
	const oauthFields = (
		<div className='grid grid-cols-1 gap-4'>
			<PrimaryInput label='Redirect URI' value={form.redirectUri} onChange={(v) => update('redirectUri', v)} required />
		</div>
	);
	const otpUsesPhone = mode !== 'recovery' && mode !== 'convert' && method === 'phone';
	const otpFields = (
		<div className='grid grid-cols-1 gap-4'>
			<PrimaryInput
				label={otpUsesPhone ? 'شماره موبایل' : 'ایمیل'}
				value={otpUsesPhone ? form.phone : form.email}
				onChange={() => undefined}
				disabled
			/>
			<PrimaryInput label='کد تأیید' otpMode value={form.code} onChange={(v) => update('code', v)} required />
			{((mode === 'register' && method === 'email') || mode === 'recovery' || mode === 'convert') && (
				<PrimaryInput
					label='رمز عبور'
					type='password'
					value={form.password}
					onChange={(v) => update('password', v)}
					required
				/>
			)}
		</div>
	);
	const responseSuccess =
		response && typeof response === 'object' && 'success' in response
			? Boolean((response as { success?: unknown }).success)
			: null;
	return (
		<main className='min-h-screen bg-surface-secondary p-4 md:p-8'>
			<div className='mx-auto grid max-w-6xl gap-4 lg:grid-cols-2'>
				<section className='rounded-xl bg-surface-primary p-4 shadow-sm md:p-8'>
					<div className='flex flex-wrap items-center justify-between gap-3'>
						<h1 className='text-2xl font-semibold text-text-primary'>MBaas SDK Test</h1>
						{notificationPermission === 'default' && (
							<PrimaryButton type='button' size='sm' onClick={() => void requestNotificationPermission()}>
								فعال‌سازی اعلان‌ها
							</PrimaryButton>
						)}
					</div>
					<p className='mt-2 text-sm text-text-secondary'>تست قابلیت‌های احراز هویت، پروفایل و نشست‌های SDK</p>
					<div className='my-8 grid grid-cols-1 gap-4'>
						<PrimarySelect
							label='عملیات'
							value={mode}
							options={modeOptions}
							onChange={(item) => item && changeMode(item.value as Mode)}
						/>
						{(mode === 'register' || mode === 'login') && (
							<PrimarySelect
								label='روش'
								value={method}
								options={methodOptions[mode]}
								onChange={(item) => item && changeMethod(item.value)}
							/>
						)}
					</div>
					<form onSubmit={submit} className='space-y-5'>
						{mode === 'device' && deviceFields}
						{(mode === 'register' || mode === 'login') && ['google', 'myGov'].includes(method) && oauthFields}
						{mode === 'login' && method === 'anonymous' && (
							<p className='rounded-lg bg-surface-secondary p-3 text-sm text-text-secondary'>
								ورود ناشناس بدون اطلاعات ورودی انجام می‌شود.
							</p>
						)}
						{(mode === 'register' || mode === 'login') &&
							!['google', 'myGov', 'anonymous'].includes(method) &&
							step === 'credentials' && (
								<div className='grid grid-cols-1 gap-4'>
									{method === 'email' ? (
										<PrimaryInput
											label='ایمیل'
											value={form.email}
											onChange={(v) => update('email', v)}
											ltr
											elProps={{ inputMode: 'email' }}
											required
										/>
									) : (
										<PrimaryInput
											label='شماره موبایل'
											value={form.phone}
											onChange={(v) => update('phone', v)}
											ltr
											elProps={{ inputMode: 'tel' }}
											required
										/>
									)}
									{mode === 'login' && method === 'email' && (
										<PrimaryInput
											label='رمز عبور'
											type='password'
											value={form.password}
											onChange={(v) => update('password', v)}
											required
										/>
									)}
								</div>
							)}
						{(mode === 'register' || mode === 'login') &&
							!['google', 'myGov', 'anonymous'].includes(method) &&
							step === 'otp' &&
							otpFields}
						{mode === 'recovery' && step === 'credentials' && (
							<div className='grid grid-cols-1 gap-4'>
								<PrimaryInput
									label='ایمیل'
									value={form.email}
									onChange={(v) => update('email', v)}
									ltr
									elProps={{ inputMode: 'email' }}
									required
								/>
							</div>
						)}
						{mode === 'recovery' && step === 'otp' && otpFields}
						{mode === 'convert' && step === 'credentials' && (
							<div className='grid grid-cols-1 gap-4'>
								<PrimaryInput
									label='ایمیل کاربر ناشناس'
									value={form.email}
									onChange={(v) => update('email', v)}
									ltr
									elProps={{ inputMode: 'email' }}
									required
								/>
							</div>
						)}
						{mode === 'convert' && step === 'otp' && (
							<div className='grid grid-cols-1 gap-4'>
								<PrimaryInput label='ایمیل' value={form.email} onChange={() => undefined} disabled ltr />
								<PrimaryInput label='کد تأیید' otpMode value={form.code} onChange={(v) => update('code', v)} required />
								<PrimaryInput
									label='رمز عبور'
									type='password'
									value={form.password}
									onChange={(v) => update('password', v)}
									required
								/>
							</div>
						)}
						{mode === 'profile' && (
							<>
								<div className='flex gap-4'>
									<PrimaryButton type='button' onClick={fetchUser} disabled={loading}>
										اطلاعات پروفایل
									</PrimaryButton>
									<PrimaryButton
										type='button'
										variant='outline'
										onClick={() => execute((sdk) => sdk.fetchAllSessions(), false, 'fetchAllSessions')}
										disabled={loading}
									>
										توکن‌های فعال
									</PrimaryButton>
								</div>
								<div className='flex gap-4 mt-8	'>
									<PrimaryInput
										label='شناسه توکن'
										value={form.tokenId}
										onChange={(v) => update('tokenId', v)}
										boxProps={{ className: 'flex-1' }}
									/>
									<PrimaryButton
										type='button'
										onClick={() =>
											execute((sdk) => sdk.revokeToken({ tokenId: form.tokenId }), false, 'revokeToken', {
												tokenId: form.tokenId,
											})
										}
										disabled={loading || !form.tokenId}
										color='danger'
									>
										ابطال توکن
									</PrimaryButton>
								</div>
								<PrimaryButton
									type='button'
									onClick={() => void logout()}
									disabled={loading || !isConfigured}
									color='danger'
									boxProps={{ className: 'mt-4' }}
								>
									خروج از حساب
								</PrimaryButton>
								<hr className='my-8' />
							</>
						)}
						{mode === 'profile' && profileFields}
						{mode === 'profile' && (
							<PrimaryButton type='submit' disabled={loading || !isConfigured} color='success'>
								{loading ? 'در حال ذخیره...' : 'ذخیره تغییرات پروفایل'}
							</PrimaryButton>
						)}
						{mode === 'login' && ['google', 'myGov'].includes(method) && (
							<div className='flex flex-wrap gap-3'>
								<PrimaryButton
									type='button'
									onClick={() => startOAuth(method as 'google' | 'myGov')}
									disabled={!isConfigured || loading}
									// className='rounded-lg bg-primary px-5 py-2.5 text-sm text-white disabled:opacity-50'
								>
									شروع ورود با {method === 'google' ? 'Google' : 'دولت من'}
								</PrimaryButton>
								<PrimaryButton
									type='button'
									onClick={() => completeOAuth(method as 'google' | 'myGov')}
									disabled={!isConfigured || loading}
									// className='rounded-lg border border-primary/40 px-5 py-2.5 text-sm text-primary disabled:opacity-50'
								>
									تکمیل callback
								</PrimaryButton>
							</div>
						)}
						{mode !== 'profile' && !(mode === 'login' && ['google', 'myGov'].includes(method)) && (
							<PrimaryButton
								type='submit'
								disabled={loading || !isConfigured}
								className='rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50'
							>
								{loading
									? 'در حال ارسال...'
									: mode === 'logout'
										? 'خروج از حساب'
										: step === 'otp'
											? 'تأیید کد'
											: mode === 'recovery'
												? 'ارسال کد بازیابی'
												: mode === 'device'
													? 'ویرایش اطلاعات دستگاه'
													: mode === 'convert'
														? 'ارسال کد تبدیل'
														: mode === 'login' && method === 'anonymous'
															? 'ورود ناشناس'
															: 'ارسال کد'}
							</PrimaryButton>
						)}
						{!isConfigured && (
							<p className='rounded-lg bg-warning/10 p-3 text-sm text-warning'>
								مقادیر SDK در `.env.local` تنظیم نشده‌اند.
							</p>
						)}
						{isConfigured && !isInitialized && !initializationError && (
							<p className='text-sm text-text-tertiary'>در حال initialize کردن Core SDK...</p>
						)}
						{initializationError && (
							<p className='rounded-lg bg-danger/10 p-3 text-sm text-danger'>
								خطا در initialize کردن Core: {initializationError.message}
							</p>
						)}
					</form>
				</section>
				<section
					className={`rounded-xl border p-4 shadow-sm md:p-8 ${responseSuccess === true ? 'border-success/30 bg-success/10' : responseSuccess === false ? 'border-danger/30 bg-danger/10' : 'border-divider/30 bg-surface-primary'}`}
				>
					<div className='mb-4 flex items-center justify-between'>
						<h2
							className={`text-lg font-semibold ${responseSuccess === true ? 'text-success' : responseSuccess === false ? 'text-danger' : 'text-text-primary'}`}
						>
							Response
						</h2>
						<PrimaryButton type='button' onClick={() => setResponse(null)} color='tertiary'>
							پاک کردن
						</PrimaryButton>
					</div>
					<pre
						dir='ltr'
						className='min-h-80 rounded-xl bg-surface-secondary/70 p-4 text-left text-xs leading-6 text-text-primary whitespace-pre-wrap break-all'
					>
						{response ? JSON.stringify(response, null, 2) : '// response اینجا نمایش داده می‌شود'}
					</pre>
				</section>
			</div>
		</main>
	);
}
