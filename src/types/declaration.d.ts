import { ImgHTMLAttributes } from 'react';

declare module 'react' {
	interface ImgHTMLAttributes<T> extends ImgHTMLAttributes<T> {
		code?: string;
	}
}
