import type { ShopEventParameterKey } from './event-parameters';

export const SHOP_EVENT_DEFINITIONS = {
	shop_opened: {
		when: 'وقتی صفحهٔ فروشگاه آمادهٔ استفاده شد.',
		parameters: ['shop_source'],
		frequency: 'یک بار در هر نشست فروشگاه.',
	},
	shop_product_viewed: {
		when: 'وقتی جزئیات یک محصول نمایش داده شد.',
		parameters: ['shop_sku', 'shop_category'],
		frequency: 'بازنمایی همان صفحه رخداد جدید نسازد.',
	},
	shop_cart_added: {
		when: 'پس از تأیید افزودن کالا به سبد.',
		parameters: ['shop_sku', 'shop_category', 'shop_quantity', 'shop_cart_total'],
	},
	shop_cart_removed: {
		when: 'پس از تأیید حذف کالا یا کم‌کردن تعداد آن.',
		parameters: ['shop_sku', 'shop_quantity', 'shop_cart_total'],
	},
	shop_checkout_started: {
		when: 'وقتی یک تسویهٔ جدید با شناسهٔ معتبر ایجاد شد.',
		parameters: ['shop_checkout_id', 'shop_cart_total', 'shop_has_coupon'],
		frequency: 'ادامهٔ همان تسویه رخداد شروع دیگری نسازد.',
	},
	shop_coupon_applied: {
		when: 'وقتی کوپن پذیرفته شد و مبلغ سبد به‌روزرسانی شد.',
		parameters: ['shop_checkout_id', 'shop_cart_total', 'shop_has_coupon'],
	},
	shop_payment_started: {
		when: 'وقتی یک تلاش پرداخت واقعاً آغاز شد.',
		parameters: ['shop_checkout_id', 'shop_payment_method', 'shop_cart_total'],
		frequency: 'برای هر تلاش مجدد رخداد جدید با همان شناسهٔ تسویه ارسال شود.',
	},
	shop_payment_failed: {
		when: 'وقتی نتیجهٔ ناموفق یا لغوشدهٔ یک تلاش پرداخت مشخص شد.',
		parameters: ['shop_checkout_id', 'shop_payment_method', 'shop_failure_reason'],
	},
	shop_order_completed: {
		when: 'وقتی سامانهٔ پرداخت و ثبت سفارش را تأیید کرد.',
		parameters: ['shop_checkout_id', 'shop_order_id', 'shop_payment_method', 'shop_cart_total', 'shop_has_coupon'],
		frequency: 'به‌ازای هر شناسهٔ سفارش فقط یک بار ارسال شود.',
	},
	shop_order_viewed: {
		when: 'وقتی کاربر جزئیات یک سفارش ثبت‌شده را از صفحهٔ سفارش‌ها باز کرد.',
		parameters: ['shop_order_id'],
	},
} as const satisfies Record<
	string,
	{
		when: string;
		parameters: readonly ShopEventParameterKey[];
		frequency?: string;
	}
>;

export type ShopEventName = keyof typeof SHOP_EVENT_DEFINITIONS;

export type ShopEventParameterKeys<TEvent extends ShopEventName> =
	(typeof SHOP_EVENT_DEFINITIONS)[TEvent]['parameters'][number];

export type ShopEventPayload<TEvent extends ShopEventName> = Record<
	ShopEventParameterKeys<TEvent>,
	string | number | boolean
>;
