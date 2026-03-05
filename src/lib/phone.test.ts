import { describe, expect, it } from 'vitest';
import { formatPhoneForDisplay, normalizePhoneToDigits, normalizePhoneWithSinglePlus } from './phone';

describe('phone normalization', () => {
  it('normalizes any input to digits', () => {
    expect(normalizePhoneToDigits(' +506 8888-7777 ')).toBe('50688887777');
    expect(normalizePhoneToDigits('abc')).toBe('');
  });

  it('normalizes to a single leading plus', () => {
    expect(normalizePhoneWithSinglePlus('++50688887777')).toBe('+50688887777');
    expect(normalizePhoneWithSinglePlus('+506 8888 7777')).toBe('+50688887777');
  });

  it('formats display phone through normalized helper', () => {
    expect(formatPhoneForDisplay('50688887777')).toBe('+50688887777');
    expect(formatPhoneForDisplay('')).toBe('');
  });
});
