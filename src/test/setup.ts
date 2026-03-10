import '@testing-library/jest-dom/vitest';

import React from 'react';
import { vi } from 'vitest';
import esMessages from '../messages/es-CR/messages.json';

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';

function resolveMessagePath(path: string, values?: Record<string, unknown>): string {
	const value = path.split('.').reduce<unknown>((current, segment) => {
		if (current && typeof current === 'object' && segment in current) {
			return (current as Record<string, unknown>)[segment];
		}

		return undefined;
	}, esMessages as unknown);

	if (typeof value !== 'string') {
		return path;
	}

	if (!values) {
		return value;
	}

	return value.replace(/\{(\w+)\}/g, (_, key: string) => {
		const replacement = values[key];
		return replacement == null ? `{${key}}` : String(replacement);
	});
}

vi.mock('next-intl', () => ({
	NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
	useTranslations: (namespace?: string) => (key: string, values?: Record<string, unknown>) => resolveMessagePath(namespace ? `${namespace}.${key}` : key, values),
	useLocale: () => 'es-CR',
}));
