export const SHOP_EVENT_PARAMETER_DEFINITIONS = {
	shop_sku: {
		type: 'string',
		description: 'کد کالا',
		example: 'sku_101',
	},
	shop_category: {
		type: 'string',
		description: 'دستهٔ کالا',
		examples: ['electronics', 'home', 'fashion'],
	},
	shop_source: {
		type: 'string',
		description: 'منبع ورود به فروشگاه در همان نشست',
		examples: ['home', 'search', 'push', 'direct'],
	},
	shop_quantity: {
		type: 'number',
		description: 'تعداد واحدهای اضافه یا حذف‌شده در همان اقدام؛ برای حذف نیز عدد مثبت ارسال شود.',
	},
	shop_cart_total: {
		type: 'number',
		description: 'مبلغ قابل پرداخت سبد پس از تخفیف، به ریال. برای افزودن و حذف، مبلغ پس از تغییر سبد ارسال شود.',
	},
	shop_has_coupon: {
		type: 'boolean',
		description: 'آیا در زمان رخداد کوپن معتبری روی سبد اعمال شده است؟',
	},
	shop_checkout_id: {
		type: 'string',
		description: 'شناسهٔ داخلی تسویه؛ در تلاش‌های مجدد ثابت بماند.',
		example: 'checkout_001',
	},
	shop_payment_method: {
		type: 'string',
		description: 'روش پرداخت',
		examples: ['gateway', 'wallet'],
	},
	shop_failure_reason: {
		type: 'string',
		description: 'کد دسته‌بندی‌شدهٔ علت شکست پرداخت',
		examples: ['declined', 'timeout', 'cancelled'],
	},
	shop_order_id: {
		type: 'string',
		description: 'شناسهٔ داخلی سفارش؛ در ثبت و مشاهدهٔ همان سفارش یکسان باشد.',
		example: 'order_001',
	},
} as const;

export type ShopEventParameterKey = keyof typeof SHOP_EVENT_PARAMETER_DEFINITIONS;

export type ShopEventParameterValue = string | number | boolean;

export type ShopEventParameters = Partial<Record<ShopEventParameterKey, ShopEventParameterValue>>;
