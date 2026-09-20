import { cpSync, existsSync, mkdirSync } from 'node:fs';

const copy = (source, destination) => {
	if (!existsSync(source)) {
		throw new Error(`Required build asset does not exist: ${source}`);
	}

	mkdirSync(destination, { recursive: true });
	cpSync(source, destination, { recursive: true });
};

copy('.next/static', '.next/standalone/.next/static');
copy('public', '.next/standalone/public');

console.log('Standalone assets copied: .next/static and public');
