export type MbaasBaseUrlConfig = {
	apiKey: string;
	coreBaseUrl: string;
	authenticationBaseUrl: string;
	websocketBaseUrl: string;
	analyticsBaseUrl: string;
};

export const MBAAS_CONFIG_STORAGE_KEY = 'mbaas:base-url-config';
export const MBAAS_CONFIG_CHANGED_EVENT = 'mbaas:base-url-config-changed';

export const emptyMbaasBaseUrlConfig: MbaasBaseUrlConfig = {
	apiKey: '',
	coreBaseUrl: '',
	authenticationBaseUrl: '',
	websocketBaseUrl: '',
	analyticsBaseUrl: '',
};

export const getEnvironmentMbaasConfig = (): MbaasBaseUrlConfig => ({
	apiKey: process.env.NEXT_PUBLIC_MBAAS_API_KEY?.trim() ?? '',
	coreBaseUrl: process.env.NEXT_PUBLIC_MBAAS_BASE_URL?.trim() ?? '',
	authenticationBaseUrl: process.env.NEXT_PUBLIC_MBAAS_AUTH_URL?.trim() ?? '',
	websocketBaseUrl:
		process.env.NEXT_PUBLIC_MBAAS_PUSH_URL?.trim() || process.env.NEXT_PUBLIC_MBAAS_WEBSOCKET_URL?.trim() || '',
	analyticsBaseUrl: process.env.NEXT_PUBLIC_MBAAS_ANALYTICS_URL?.trim() ?? '',
});

export const readMbaasBaseUrlConfig = (): MbaasBaseUrlConfig => {
	const environmentConfig = getEnvironmentMbaasConfig();
	if (typeof window === 'undefined') return environmentConfig;

	try {
		const storedConfig = JSON.parse(
			window.localStorage.getItem(MBAAS_CONFIG_STORAGE_KEY) ?? '{}',
		) as Partial<MbaasBaseUrlConfig>;
		return {
			apiKey: storedConfig.apiKey?.trim() || environmentConfig.apiKey,
			coreBaseUrl: storedConfig.coreBaseUrl?.trim() || environmentConfig.coreBaseUrl,
			authenticationBaseUrl: storedConfig.authenticationBaseUrl?.trim() || environmentConfig.authenticationBaseUrl,
			websocketBaseUrl: storedConfig.websocketBaseUrl?.trim() || environmentConfig.websocketBaseUrl,
			analyticsBaseUrl: storedConfig.analyticsBaseUrl?.trim() || environmentConfig.analyticsBaseUrl,
		};
	} catch {
		return environmentConfig;
	}
};

export const writeMbaasBaseUrlConfig = (config: MbaasBaseUrlConfig) => {
	window.localStorage.setItem(MBAAS_CONFIG_STORAGE_KEY, JSON.stringify(config));
	window.dispatchEvent(new CustomEvent(MBAAS_CONFIG_CHANGED_EVENT));
};
