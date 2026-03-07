import { describe, expect, it } from 'vitest';
import { isPublicAnonymousPath } from './public-routes';

describe('isPublicAnonymousPath', () => {
  it('allows public menu browsing routes', () => {
    expect(isPublicAnonymousPath('/')).toBe(true);
    expect(isPublicAnonymousPath('/search')).toBe(true);
    expect(isPublicAnonymousPath('/sumo-sushi')).toBe(true);
    expect(isPublicAnonymousPath('/group/session-123')).toBe(true);
  });

  it('keeps authenticated flows protected', () => {
    expect(isPublicAnonymousPath('/checkout')).toBe(false);
    expect(isPublicAnonymousPath('/profile')).toBe(false);
    expect(isPublicAnonymousPath('/orders/order-1')).toBe(false);
    expect(isPublicAnonymousPath('/auth/sign-in')).toBe(false);
  });
});