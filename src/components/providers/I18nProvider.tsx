"use client";

import { useEffect, useMemo } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { useCartStore } from '@/store';
import { normalizeLocale } from '@/i18n/config';
import { MESSAGES } from '@/i18n/messages';

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useCartStore((state) => state.locale);
  const timeZone = 'America/Costa_Rica';

  const resolvedLocale = normalizeLocale(locale);
  const messages = useMemo(() => MESSAGES[resolvedLocale], [resolvedLocale]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = resolvedLocale;
    }
  }, [resolvedLocale]);

  return (
    <NextIntlClientProvider locale={resolvedLocale} messages={messages} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  );
}
