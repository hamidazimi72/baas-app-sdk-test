import type { Metadata } from 'next';

import { iranSans } from '@/assets/fonts/local-fonts';
import { MbaasProvider } from '@/sdk/mbaas-provider';

import '@/assets/styles/global.css';

export const metadata: Metadata = {
	title: 'BAAS SDK Test',
	description: 'Shared BAAS UI components and SDK proxy workspace',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang='fa' dir='rtl' cz-shortcut-listen='true'>
			<body className={iranSans.className}>
				<MbaasProvider>{children}</MbaasProvider>
			</body>
		</html>
	);
}
