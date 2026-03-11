import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingProfilePage from './page';

const replaceMock = vi.fn();
const pushMock = vi.fn();

vi.mock('@/hooks/useAppRouter', () => ({
  useAppRouter: () => ({
    replace: replaceMock,
    push: pushMock,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('@/components/BottomNav', () => ({
  default: () => <div data-testid="bottom-nav" />,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: {
            access_token: 'token-123',
          },
        },
      })),
    },
  },
}));

const mockStore = {
  customerName: '',
  fromNumber: '',
  customerAddress: null,
  setCustomerName: vi.fn(),
  setFromNumber: vi.fn(),
  hydrateClientContext: vi.fn(),
};

vi.mock('@/store', () => ({
  useCartStore: () => mockStore,
}));

describe('OnboardingProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url === '/api/profile/me' && init?.method === 'PUT') {
        return {
          ok: true,
          json: async () => ({
            profile: {
              fullName: 'Ivan Mora',
              phone: '+50688881234',
            },
          }),
        } as any;
      }

      return {
        ok: true,
        json: async () => ({}),
      } as any;
    }) as any);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves profile basics and continues to address when no saved address exists', async () => {
    const user = userEvent.setup();

    render(<OnboardingProfilePage />);

    await user.type(screen.getByLabelText('Nombre completo'), 'Ivan Mora');
    await user.type(screen.getByLabelText('Teléfono'), '88881234');
    await user.click(screen.getByRole('button', { name: 'Guardar y continuar a dirección' }));

    await waitFor(() => {
      expect(mockStore.setCustomerName).toHaveBeenCalledWith('Ivan Mora');
      expect(mockStore.setFromNumber).toHaveBeenCalledWith('+50688881234');
      expect(replaceMock).toHaveBeenCalledWith('/address?next=%2F');
    });
  }, 10000);
});