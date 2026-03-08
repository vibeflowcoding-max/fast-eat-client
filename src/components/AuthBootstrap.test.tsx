import { render, waitFor } from '@testing-library/react';
import AuthBootstrap from './AuthBootstrap';

const {
  replace,
  unsubscribe,
  getSession,
  onAuthStateChange,
  fetchClientBootstrap,
  storeState,
} = vi.hoisted(() => ({
  replace: vi.fn(),
  unsubscribe: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  fetchClientBootstrap: vi.fn(async () => null),
  storeState: {
    setAuthSession: vi.fn(),
    clearAuthSession: vi.fn(),
    setAuthHydrated: vi.fn(),
    hydrateClientContext: vi.fn(),
    setSavedCarts: vi.fn(),
    setSavedCartsHydrated: vi.fn(),
    setSavedCartsError: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/auth/sign-in',
  useSearchParams: () => new URLSearchParams('next=%2Fcheckout'),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession,
      onAuthStateChange,
    },
  },
}));

vi.mock('@/lib/public-routes', () => ({
  isPublicAnonymousPath: () => false,
}));

vi.mock('@/services/api', () => ({
  fetchClientBootstrap: (...args: unknown[]) => fetchClientBootstrap(...args),
}));

vi.mock('@/store', () => ({
  useCartStore: () => storeState,
}));

vi.mock('@/lib/phone', () => ({
  normalizePhoneWithSinglePlus: (value: string | null) => value,
}));

vi.mock('@/lib/location', () => ({
  extractGoogleMapsUrl: (value: string | null) => value,
  parseCoordsFromGoogleMapsUrl: () => ({}),
}));

describe('AuthBootstrap', () => {
  beforeEach(() => {
    replace.mockReset();
    unsubscribe.mockReset();
    getSession.mockReset();
    onAuthStateChange.mockReset();
    fetchClientBootstrap.mockClear();
    Object.values(storeState).forEach((mockFn) => mockFn.mockClear());

    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-1',
          user: {
            id: 'user-1',
            email: 'user@example.com',
          },
        },
      },
    });

    onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe,
        },
      },
    });
  });

  it('redirects authenticated auth-route sessions to the requested next path', async () => {
    render(<AuthBootstrap />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/checkout');
    });

    expect(storeState.setAuthSession).toHaveBeenCalledWith({
      userId: 'user-1',
      email: 'user@example.com',
    });
    expect(fetchClientBootstrap).toHaveBeenCalled();
  });
});