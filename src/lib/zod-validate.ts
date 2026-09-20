import type { ZodType } from 'zod';
import { z } from 'zod';

// ─── Helper ────────────────────────────────────────────────────────────────────
export const isValid = (schema: ZodType, value: unknown): boolean => !!schema.safeParse(value)?.success;

export const isValidOptional = (schema: ZodType, value: unknown): boolean => {
	if (value === '' || value === undefined || value === null) return true;
	return schema.safeParse(value).success;
};

// ─── Schema Definitions ────────────────────────────────────────────────────────

export const Schema = {
	// Auth
	token: z.string().min(30, 'نامعتبر است'),

	// Public

	postalCode: z.string().length(10, 'باید ۱۰ رقم باشد').regex(/^\d+$/, 'فقط شامل عدد است'),

	phone: z.string().length(11, 'باید ۱۱ رقم باشد').regex(/^\d+$/, 'فقط شامل عدد است'),

	cellphone: z
		.string()
		.length(11, 'باید ۱۱ رقم باشد')
		.startsWith('09', 'باید با ۰۹ شروع شود')
		.regex(/^\d+$/, 'فقط شامل عدد است'),

	password: z
		.string()
		.min(8, 'حداقل ۸ کاراکتر')
		.regex(/[A-Z]/, 'باید حداقل یک حرف بزرگ انگلیسی داشته باشد')
		.regex(/[a-z]/, 'باید حداقل یک حرف کوچک انگلیسی داشته باشد')
		.regex(/[0-9]/, 'باید حداقل یک عدد داشته باشد')
		.regex(/[@#$%^&*]/, 'باید حداقل یک کاراکتر ویژه (@#$%^&*) داشته باشد'),

	passwordSimple: z.string().min(6, 'حداقل 6 کاراکتر'),

	username: z.string().min(3, 'حداقل ۳ کاراکتر'),

	captcha: z.string().min(6, 'وارد کردن کد کپچا الزامی است'),

	name: z.string().min(3, 'حداقل ۳ کاراکتر'),

	lastName: z.string().min(1, 'الزامی است'),

	description: z.string().min(3, 'حداقل ۳ کاراکتر'),

	address: z.string().min(5, 'حداقل ۵ کاراکتر'),

	ipAddress: z.string().refine((value) => {
		const octets = value.split('.');
		return octets.length === 4 && octets.every((octet) => /^(0|[1-9]\d*)$/.test(octet) && Number(octet) <= 255);
	}, 'آدرس IP معتبر نیست'),

	otp: z.string().length(6, 'باید ۶ رقم باشد').regex(/^\d+$/, 'فقط شامل عدد است'),

	date: z.string().min(1, 'الزامی است'),

	image: z.string().min(1, 'الزامی است'),

	email: z.string().email('نامعتبر است'),

	nationalNumber: z
		.string()
		.length(10, 'باید ۱۰ رقم باشد')
		.regex(/^\d+$/, 'فقط شامل عدد است')
		.refine((value) => {
			if (parseInt(value, 10) === 0) return false;
			value = ('0000' + value).substr(value.length + 4 - 10);
			if (parseInt(value.substr(3, 6), 10) === 0) return false;
			const c = parseInt(value.substr(9, 1), 10);
			let s = 0;
			for (let i = 0; i < 9; i++) s += parseInt(value.substr(i, 1), 10) * (10 - i);
			s = s % 11;
			return (s < 2 && c === s) || (s >= 2 && c === 11 - s);
		}, 'نامعتبر است'),

	json: z.string().refine((value) => {
		try {
			JSON.parse(value);
			return true;
		} catch {
			return false;
		}
	}, 'فرمت نامعتبر است'),

	// Android package name, e.g. com.example.app
	packageName: z
		.string()
		.regex(/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/, 'فرمت نامعتبر است (مثال: com.example.app)'),

	// ─── Tenant ─────────────────────────────────────────────────────────────────────
	tenantCode: z.string().min(3, 'نامعتبر است'),
} as const;

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SchemaKeys = keyof typeof Schema;

export type SchemaMap = typeof Schema;
