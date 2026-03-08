export function normalizePhoneToDigits(value: string | null | undefined): string {
  return String(value || '').replace(/\D/g, '');
}

export function normalizePhoneWithSinglePlus(value: string | null | undefined): string {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  const digits = normalizePhoneToDigits(raw);
  if (!digits) {
    return '';
  }

  return `+${digits}`;
}

export function formatPhoneForDisplay(value: string | null | undefined): string {
  return normalizePhoneWithSinglePlus(value);
}