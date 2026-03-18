import { buildAuthCallbackUrl, DEFAULT_POST_AUTH_PATH, resolvePostAuthRedirect } from './auth-redirect';

describe('auth redirect helpers', () => {
  it('always sends authenticated auth routes to Home', () => {
    expect(resolvePostAuthRedirect('/auth/sign-in')).toBe(DEFAULT_POST_AUTH_PATH);
    expect(resolvePostAuthRedirect('/auth/sign-up')).toBe(DEFAULT_POST_AUTH_PATH);
    expect(resolvePostAuthRedirect('/auth/callback')).toBe(DEFAULT_POST_AUTH_PATH);
  });

  it('does not redirect non-auth routes', () => {
    expect(resolvePostAuthRedirect('/')).toBeNull();
    expect(resolvePostAuthRedirect('/carts')).toBeNull();
    expect(resolvePostAuthRedirect('/checkout')).toBeNull();
  });

  it('builds the auth callback URL without a next target', () => {
    expect(buildAuthCallbackUrl('https://app.example.com')).toBe('https://app.example.com/auth/callback');
  });
});