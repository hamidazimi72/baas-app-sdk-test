export type MbaasConfig = {
	apiKey: string;
};

export const MBAAS_CONFIG_STORAGE_KEY = 'mbaas:config';
export const MBAAS_CONFIG_CHANGED_EVENT = 'mbaas:config-changed';

const LEGACY_MBAAS_CONFIG_STORAGE_KEY = 'mbaas:base-url-config';

export const emptyMbaasConfig: MbaasConfig = {
	apiKey: '',
};

export const getEnvironmentMbaasConfig = (): MbaasConfig => ({
	apiKey: process.env.NEXT_PUBLIC_MBAAS_API_KEY?.trim() ?? '',
});

export const readMbaasConfig = (): MbaasConfig => {
	const environmentConfig = getEnvironmentMbaasConfig();
	if (typeof window === 'undefined') return environmentConfig;

	try {
		const currentValue = window.localStorage.getItem(MBAAS_CONFIG_STORAGE_KEY);
		const legacyValue = currentValue === null ? window.localStorage.getItem(LEGACY_MBAAS_CONFIG_STORAGE_KEY) : null;
		const storedConfig = JSON.parse(currentValue ?? legacyValue ?? '{}') as Partial<MbaasConfig>;
		const config = {
			apiKey: storedConfig.apiKey?.trim() || environmentConfig.apiKey,
		};

		if (legacyValue !== null) {
			window.localStorage.setItem(MBAAS_CONFIG_STORAGE_KEY, JSON.stringify(config));
			window.localStorage.removeItem(LEGACY_MBAAS_CONFIG_STORAGE_KEY);
		}

		return config;
	} catch {
		return environmentConfig;
	}
};

export const writeMbaasConfig = (config: MbaasConfig) => {
	window.localStorage.setItem(MBAAS_CONFIG_STORAGE_KEY, JSON.stringify(config));
	window.localStorage.removeItem(LEGACY_MBAAS_CONFIG_STORAGE_KEY);
	window.dispatchEvent(new CustomEvent(MBAAS_CONFIG_CHANGED_EVENT));
};
