import type { ZodType } from 'zod';

type MatcherResult = boolean | string | null | undefined;

type FieldDef = {
	value: unknown;
	schema?: ZodType;
	label: string;
	placeholder?: string;
	invalidMessage?: string;
	optional?: boolean;
	matcher?: (value: unknown, allValues: Record<string, unknown>) => MatcherResult;
};

type FieldsDef = Record<string, FieldDef>;

type MessageSource = 'schema' | 'matcher' | 'fallback';

type FieldResult = {
	label: string;
	placeholder: string | undefined;
	message: string;
	labeledMessage: string;
	isValid: boolean;
	isOptional: boolean;
};

export type UseFormValidationReturn<TKey extends string = string> = {
	fields: Record<TKey, FieldResult>;
	isValidForm: boolean;
	invalidKeys: TKey[];
	firstInvalidMessage: string | null;
	firstInvalidLabeledMessage: string | null;
};

type FormResult<T extends FieldsDef> = UseFormValidationReturn<keyof T & string>;

type Options = {
	allowSchemaDefaults?: boolean;
	formatLabeled?: (message: string, ctx: { key: string; label: string; source: MessageSource }) => string;
	defaultInvalidMessage?: string;
};

type IssueLike = { message: string };

const DEFAULT_SENTINEL = '\u0000__ZOD_DEFAULT__';

const silentError = () => DEFAULT_SENTINEL;

function isEmptyValue(value: unknown): boolean {
	if (value == null) return true;
	if (typeof value === 'string') return value.trim() === '';
	if (Array.isArray(value)) return value.length === 0;
	return false;
}

function pickAuthoredMessage(issues: IssueLike[]): string | null {
	for (const issue of issues) {
		if (issue.message && issue.message !== DEFAULT_SENTINEL) return issue.message;
	}
	return null;
}

export function useFormValidation<T extends FieldsDef>(fieldsDef: T, options: Options = {}): FormResult<T> {
	const { allowSchemaDefaults = false } = options;
	const formatLabeled = options.formatLabeled ?? ((msg, ctx) => `${ctx.label ?? ''}: ${msg}`);
	const defaultInvalidMessage = options?.defaultInvalidMessage || 'معتبر نمی باشد';

	const keys = Object.keys(fieldsDef) as (keyof T & string)[];

	const allValues: Record<string, unknown> = {};
	for (const key of keys) allValues[key] = fieldsDef[key]?.value;

	const fields = {} as FormResult<T>['fields'];
	const invalidKeys: (keyof T & string)[] = [];

	for (const key of keys) {
		const def = fieldsDef[key];
		if (!def) continue;

		const finish = (isValid: boolean, message: string, source: MessageSource) => {
			fields[key] = {
				label: def.label,
				placeholder: def.placeholder,
				isOptional: !!def.optional,
				isValid,
				message: isValid ? '' : message,
				labeledMessage: isValid ? '' : formatLabeled(message, { key, label: def.label, source }),
			};
			if (!isValid) invalidKeys.push(key);
		};

		if (def.optional && isEmptyValue(def.value)) {
			finish(true, '', 'fallback');
			continue;
		}

		if (!def.schema && !def.matcher) {
			if (process.env.NODE_ENV !== 'production') {
				throw new Error(`useFormValidation: field "${key}" needs a schema or matcher.`);
			}
			finish(false, def.invalidMessage || defaultInvalidMessage, 'fallback');
			continue;
		}

		let isValid = true;
		let message = def.invalidMessage || defaultInvalidMessage;
		let source: MessageSource = 'fallback';

		// ۱) schema
		if (def.schema) {
			const result = allowSchemaDefaults
				? def.schema.safeParse(def.value)
				: def.schema.safeParse(def.value, { error: silentError });

			if (!result.success) {
				isValid = false;
				const authored = allowSchemaDefaults
					? (result.error.issues[0]?.message ?? null)
					: pickAuthoredMessage(result.error.issues as IssueLike[]);

				if (authored != null) {
					message = authored; // پیام نوشته‌شده توسط ما
					source = 'schema';
				} else {
					message = def.invalidMessage || defaultInvalidMessage;
					source = 'fallback';
				}
			}
		}

		// ۲) matcher
		if (isValid && def.matcher) {
			const r = def.matcher(def.value, allValues);
			if (typeof r === 'string') {
				isValid = false;
				message = r;
				source = 'matcher';
			} else if (r === false) {
				isValid = false;
				message = def.invalidMessage || defaultInvalidMessage;
				source = 'fallback';
			}
			// null/undefined → Field Is Valid
		}

		finish(isValid, message, source);
	}

	const firstKey = invalidKeys[0];
	const first = firstKey != null ? fields[firstKey] : null;

	return {
		fields,
		isValidForm: invalidKeys.length === 0,
		invalidKeys,
		firstInvalidMessage: first ? first.message : null,
		firstInvalidLabeledMessage: first ? first.labeledMessage : null,
	};
}
