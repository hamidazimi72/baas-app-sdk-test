import localFont from 'next/font/local';

export const iranSans = localFont({
	src: [
		{
			path: './iransans/iransans-400.woff',
			weight: '400',
			style: 'normal',
		},
		{
			path: './iransans/iransans-500.woff',
			weight: '500',
			style: 'normal',
		},
		{
			path: './iransans/iransans-600.woff',
			weight: '600',
			style: 'normal',
		},
		{
			path: './iransans/iransans-700.woff',
			weight: '700',
			style: 'normal',
		},
	],
	variable: '--font-iran-sans',
	display: 'swap',
});
