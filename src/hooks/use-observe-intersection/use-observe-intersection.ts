'use client';

import { useState, useEffect } from 'react';

export const useObserveIntersection = (
	ref: React.MutableRefObject<any>,
	options: IntersectionObserverInit = { threshold: 0.5 },
): IntersectionObserverEntry | null => {
	const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

	useEffect(() => {
		const node = ref.current;
		if (!node) return;

		const observer = new IntersectionObserver(([entry]) => {
			setEntry(entry || null);
		}, options);

		observer.observe(node);

		return () => {
			observer.unobserve(node);
			observer.disconnect();
		};
	}, [ref, options.threshold, options.root, options.rootMargin]);

	return entry;
};
