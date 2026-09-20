type JsonRecord = Record<string, unknown>;

const EPOCH_MILLISECONDS_THRESHOLD = 1_000_000_000_000;

const valueAsString = (value: unknown): string | undefined => {
	if (typeof value === 'string') return value;
	if (typeof value === 'number') return String(value);
	return undefined;
};

/** Accepts backend epoch timestamps in either seconds or milliseconds. */
export const normalizeSessionExpiry = (value: unknown): number | undefined => {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
	return value < EPOCH_MILLISECONDS_THRESHOLD ? value * 1000 : value;
};

/** Builds the browser-safe profile stored in the session; the backend token is always discarded. */
export const createSessionProfile = (
	data: JsonRecord,
	requestData: JsonRecord,
	isRegistration: boolean,
): JsonRecord => {
	const { token: _token, ...safeData } = data;
	if (!isRegistration) return safeData;

	const tenantId = valueAsString(safeData.tenantId);
	return {
		...safeData,
		userId: valueAsString(safeData.userId) ?? tenantId,
		username: valueAsString(safeData.username) ?? valueAsString(requestData.username),
		tenantId: tenantId ?? null,
		cellphone: valueAsString(safeData.cellphone) ?? valueAsString(requestData.cellphone) ?? null,
	};
};
