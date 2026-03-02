export const SUPPORTED_LOCALES = ['es-CR', 'en-US'] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'es-CR';

export const LOCALE_LABELS: Record<AppLocale, string> = {
  'es-CR': 'Español',
  'en-US': 'English',
};

export function isSupportedLocale(value: string): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale);
}

const LOCALE_ALIASES: Record<string, AppLocale> = {
  es: 'es-CR',
  'es-cr': 'es-CR',
  'es_es': 'es-CR',
  'es-es': 'es-CR',
  en: 'en-US',
  'en-us': 'en-US',
  'en_gb': 'en-US',
  'en-gb': 'en-US',
};

export function normalizeLocale(value: string | null | undefined): AppLocale {
  if (!value) {
    return DEFAULT_LOCALE;
  }

  if (isSupportedLocale(value)) {
    return value;
  }

  const normalizedKey = value.trim().toLowerCase();
  return LOCALE_ALIASES[normalizedKey] ?? DEFAULT_LOCALE;
}
