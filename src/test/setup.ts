import '@testing-library/jest-dom/vitest';

import React from 'react';
import { vi } from 'vitest';
import esMessages from '../messages/es-CR/messages.json';

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';

function resolveMessagePath(path: string): string {
	const value = path.split('.').reduce<unknown>((current, segment) => {
		if (current && typeof current === 'object' && segment in current) {
			return (current as Record<string, unknown>)[segment];
		}

		return undefined;
	}, esMessages as unknown);

	return typeof value === 'string' ? value : path;
}

vi.mock('next-intl', () => ({
	NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
	useTranslations: (namespace?: string) => (key: string) => resolveMessagePath(namespace ? `${namespace}.${key}` : key),
	useLocale: () => 'es-CR',
}));
