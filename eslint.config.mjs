import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';

const sourceFiles = ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'];

export default [
  ...nextCoreWebVitals,
  {
    files: sourceFiles,
    plugins: {
      '@typescript-eslint': typescriptEslintPlugin,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['node_modules/**', '.next/**', 'eslint.config.mjs'],
  },
];