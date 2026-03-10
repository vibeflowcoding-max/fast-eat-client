import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProfilePage from './page';

const { getSessionMock, signOutMock, setLocaleMock, fetchDietaryProfileMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  signOutMock: vi.fn(),
  setLocaleMock: vi.fn(),
  fetchDietaryProfileMock: vi.fn(),
}));

const storeState = {
  fromNumber: '50688888888',
  customerName: 'Ana Gomez',
  dietaryProfile: null,
  isAuthenticated: true,
  setCustomerName: vi.fn(),
  setFromNumber: vi.fn(),
  setDietaryProfile: vi.fn(),
  hydrateClientContext: vi.fn(),
};

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

vi.mock('@/components/BottomNav', () => ({
  default: () => <div>bottom-nav</div>,
}));

vi.mock('@/hooks/useAppRouter', () => ({
  useAppRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/hooks/useAppLocale', () => ({
  useAppLocale: () => ({ locale: 'es-CR', setLocale: setLocaleMock }),
}));

vi.mock('@/store', () => ({
  useCartStore: () => storeState,
}));

vi.mock('@/services/api', () => ({
  fetchDietaryProfile: (...args: unknown[]) => fetchDietaryProfileMock(...args),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
      signOut: (...args: unknown[]) => signOutMock(...args),
    },
  },
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    storeState.fromNumber = '50688888888';
    storeState.customerName = 'Ana Gomez';
    storeState.dietaryProfile = null;
    storeState.isAuthenticated = true;
    storeState.setCustomerName.mockReset();
    storeState.setFromNumber.mockReset();
    storeState.setDietaryProfile.mockReset();
    storeState.hydrateClientContext.mockReset();

    setLocaleMock.mockReset();
    fetchDietaryProfileMock.mockReset().mockResolvedValue(null);
    getSessionMock.mockReset().mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
        },
      },
    });
    signOutMock.mockReset().mockResolvedValue({ error: null });

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/profile/me') {
        return {
          ok: true,
          json: async () => ({
            profile: {
              userId: 'user-1',
              email: 'ana@example.com',
              fullName: 'Ana Gomez',
              phone: '50688888888',
              urlGoogleMaps: null,
            },
          }),
        } as Response;
      }

      if (url.startsWith('/api/customer/profile?phone=')) {
        return {
          ok: true,
          json: async () => ({ favoriteRestaurants: [] }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders an authenticated logout action and signs out on click', async () => {
    render(<ProfilePage />);

    const logoutButton = await screen.findByRole('button', { name: 'logoutButton' });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
    });
  });

  it('shows the sign-out error when logout fails', async () => {
    signOutMock.mockResolvedValueOnce({ error: new Error('logout_failed') });

    render(<ProfilePage />);

    fireEvent.click(await screen.findByRole('button', { name: 'logoutButton' }));

    await waitFor(() => {
      expect(screen.getByText(/logout_failed|logoutError/i)).toBeInTheDocument();
    });
  });
});