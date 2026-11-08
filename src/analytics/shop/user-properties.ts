export const SHOP_USER_PROPERTY_DEFINITIONS = {
	shop_age_group: {
		type: 'string',
		description: 'گروه سنی؛ گروه سنی کافی است و تاریخ تولد لازم نیست.',
		values: ['18_24', '25_34', '35_44', '45_54', '55_plus'],
	},
	shop_city: {
		type: 'string',
		description: 'شهر پروفایل با کد ثابت؛ باید با استان سازگار باشد.',
		examples: ['tehran', 'shiraz', 'mashhad'],
	},
	shop_province: {
		type: 'string',
		description: 'استان پروفایل؛ باید با شهر سازگار باشد.',
		examples: ['tehran', 'fars', 'khorasan_razavi'],
	},
	shop_language: {
		type: 'string',
		description: 'زبان انتخاب‌شده در تنظیمات کاربر',
		values: ['fa', 'en'],
	},
	shop_account_type: {
		type: 'string',
		description: 'نوع حساب کاربر',
		values: ['personal', 'business'],
	},
	shop_loyalty_tier: {
		type: 'string',
		description: 'سطح عضویت در باشگاه مشتریان',
		values: ['none', 'silver', 'gold'],
	},
	shop_preferred_delivery: {
		type: 'string',
		description: 'ترجیح ذخیره‌شدهٔ کاربر برای تحویل؛ ممکن است با روش انتخاب‌شده در یک سفارش متفاوت باشد.',
		values: ['standard', 'express', 'pickup'],
	},
	shop_offers_opt_in: {
		type: 'boolean',
		description: 'وضعیت انتخاب کاربر برای دریافت پیشنهادهای فروشگاه',
	},
	shop_preferred_category: {
		type: 'string',
		description: 'دستهٔ موردعلاقه‌ای که کاربر در پروفایل انتخاب کرده است.',
		values: ['electronics', 'home', 'fashion'],
	},
	shop_order_count: {
		type: 'number',
		description: 'تعداد کل سفارش‌های تأییدشده از سیستم سفارش؛ پس از هر خرید موفق به‌روز شود.',
	},
} as const;

export type ShopUserPropertyKey = keyof typeof SHOP_USER_PROPERTY_DEFINITIONS;

export interface ShopUserProperties {
	shop_age_group?: string;
	shop_city?: string;
	shop_province?: string;
	shop_language?: string;
	shop_account_type?: string;
	shop_loyalty_tier?: string;
	shop_preferred_delivery?: string;
	shop_offers_opt_in?: boolean;
	shop_preferred_category?: string;
	shop_order_count?: number;
}

/**
 * ویژگی‌ها را از پروفایل ساختگی بخوانید؛ مقدارهای ناموجود را ارسال یا حدس نزنید.
 * هنگام ورود تنظیم و با تغییر پروفایل به‌روزرسانی شوند.
 */
export type ShopUserPropertyValues = Partial<ShopUserProperties>;
