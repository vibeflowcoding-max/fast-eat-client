"use client";

import { useCallback } from 'react';
import { normalizeLocale, type AppLocale } from '@/i18n/config';
import { useCartStore } from '@/store';

export function useAppLocale() {
  const locale = useCartStore((state) => state.locale);
  const setLocale = useCartStore((state) => state.setLocale);

  const resolvedLocale: AppLocale = normalizeLocale(locale);

  const updateLocale = useCallback((nextLocale: AppLocale) => {
    setLocale(nextLocale);
  }, [setLocale]);

  return {
    locale: resolvedLocale,
    setLocale: updateLocale,
  };
}
