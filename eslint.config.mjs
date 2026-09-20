import nextVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/** @type {import('eslint').Linter.Config[]} */
const config = [
	// ─── Ignores ────────────────────────────────────────────────────────────────
	{
		ignores: ['src/helper/indexed-db/idb-libary/**', 'src/helper/math-api/asset/**', 'doc/**', '.claude/**'],
	},

	// ─── Base presets ───────────────────────────────────────────────────────────
	...nextVitals,
	...tseslint.configs.recommended,

	// ─── Project rules ──────────────────────────────────────────────────────────
	{
		plugins: {
			'react-hooks': reactHooks,
		},
		rules: {
			// React
			'react/react-in-jsx-scope': 'off',

			// React Hooks

			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'off',
			'react-hooks/refs': 'off',
			'react-hooks/set-state-in-effect': 'off',
			'react-hooks/immutability': 'off',
			'react-hooks/purity': 'off',

			// Next.js
			'@next/next/no-img-element': 'off',

			// TypeScript
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-namespace': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true },
			],
			'@typescript-eslint/no-unused-expressions': ['warn', { allowShortCircuit: true, allowTernary: true }],
		},
	},

	// ─── Type-only imports (TS/TSX) ──────────────────────────────────────────────
	{
		files: ['**/*.ts', '**/*.tsx'],
		rules: {
			'@typescript-eslint/consistent-type-imports': [
				'warn',
				{ prefer: 'type-imports', fixStyle: 'separate-type-imports', disallowTypeAnnotations: false },
			],
		},
	},

	// ─── Ambient declaration files ───────────────────────────────────────────────
	{
		files: ['**/*.d.ts'],
		rules: {
			'no-var': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
		},
	},
];

export default config;
