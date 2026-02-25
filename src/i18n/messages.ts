import { AppLocale } from '@/i18n/config';
import esCRMessages from '@/messages/es-CR/messages.json';
import enUSMessages from '@/messages/en-US/messages.json';

export const MESSAGES: Record<AppLocale, Record<string, unknown>> = {
  'es-CR': esCRMessages,
  'en-US': enUSMessages,
};
