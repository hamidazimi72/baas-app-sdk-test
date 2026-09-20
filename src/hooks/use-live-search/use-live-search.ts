import { useState, useEffect, useRef } from 'react';

export const useLiveSearch = (value = '', onSearch = () => {}, setting = { delay: 2000 }) => {
	const [searchTerm, setSearchTerm] = useState('');
	const onSearchRef = useRef(onSearch);
	onSearchRef.current = onSearch;

	const delay = setting?.delay ?? 2000;

	useEffect(() => {
		setSearchTerm(value);
	}, [value]);

	useEffect(() => {
		const timer = setTimeout(() => {
			onSearchRef.current();
		}, delay);

		return () => clearTimeout(timer);
	}, [searchTerm, delay]);

	return { searchTerm, setSearchTerm };
};
