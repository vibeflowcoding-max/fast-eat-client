import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddressPage from './page';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('next=%2Fprofile'),
}));

vi.mock('@/hooks/useAppRouter', () => ({
  useAppRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('@/lib/client-auth', () => ({
  getAccessToken: vi.fn(async () => 'token-123'),
  getAuthenticatedJsonHeaders: vi.fn(async () => ({
    'Content-Type': 'application/json',
    Authorization: 'Bearer token-123',
  })),
}));

vi.mock('@/features/home-discovery/analytics', () => ({
  emitHomeEvent: vi.fn(),
}));

vi.mock('@/components/BottomNav', () => ({
  default: () => <div data-testid="bottom-nav" />,
}));

vi.mock('@/components/AddressDetailsForm', () => ({
  default: ({ onSave, onSecondaryAction, secondaryActionLabel }: any) => (
    <div>
      <button
        type="button"
        onClick={() => onSave({
          urlAddress: 'https://www.google.com/maps/search/?api=1&query=9.9,-84.1',
          buildingType: 'Apartment',
          deliveryNotes: 'Meet at door',
          lat: 9.9,
          lng: -84.1,
          formattedAddress: 'San Jose, Costa Rica',
          placeId: 'place-123',
        })}
      >
        Save address
      </button>
      <button type="button" onClick={onSecondaryAction}>{secondaryActionLabel}</button>
    </div>
  ),
}));

const mockStore = {
  customerAddress: {
    customerId: 'cust-1',
    urlAddress: 'https://www.google.com/maps/search/?api=1&query=9.9,-84.1',
    buildingType: 'Apartment' as const,
    deliveryNotes: 'Meet at door',
    lat: 9.9,
    lng: -84.1,
    formattedAddress: 'San Jose, Costa Rica',
    placeId: 'place-123',
  },
  customerName: 'Ivan Mora',
  fromNumber: '+50688881234',
  userLocation: { lat: 9.93, lng: -84.09 },
  setCustomerAddress: vi.fn(),
  setOnboarded: vi.fn(),
  setProfilePromptDismissedAt: vi.fn(),
  hydrateClientContext: vi.fn(),
};

vi.mock('@/store', () => ({
  useCartStore: () => mockStore,
}));

describe('AddressPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url === '/api/customer/address' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            address: {
              customer_id: 'cust-1',
              url_address: 'https://www.google.com/maps/search/?api=1&query=9.9,-84.1',
              building_type: 'Apartment',
              delivery_notes: 'Meet at door',
              lat: 9.9,
              lng: -84.1,
              formatted_address: 'San Jose, Costa Rica',
              place_id: 'place-123',
            },
          }),
        } as any;
      }

      if (url === '/api/profile/me' && init?.method === 'PATCH') {
        return {
          ok: true,
          json: async () => ({ ok: true }),
        } as any;
      }

      if (url === '/api/customer/address') {
        return {
          ok: true,
          json: async () => ({ address: null }),
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

  it('saves the address and returns to profile with a success flag', async () => {
    const user = userEvent.setup();

    render(<AddressPage />);

    await user.click(screen.getByRole('button', { name: 'Save address' }));

    await waitFor(() => {
      expect(mockStore.setCustomerAddress).toHaveBeenCalledWith(expect.objectContaining({
        urlAddress: 'https://www.google.com/maps/search/?api=1&query=9.9,-84.1',
      }));
      expect(replaceMock).toHaveBeenCalledWith('/profile?addressSaved=1');
    });
  });
});