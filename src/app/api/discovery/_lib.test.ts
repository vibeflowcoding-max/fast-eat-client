import { describe, it, expect } from 'vitest';
import { getStrategyVersion } from './_lib';

describe('Discovery API _lib', () => {
  describe('getStrategyVersion', () => {
    it('returns the correct strategy version', () => {
      const version = getStrategyVersion();
      expect(version).toBe('discovery-v1.0.0');
    });
  });
});
