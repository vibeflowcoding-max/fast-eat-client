import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from './HomePage';
import { emitHomeEvent } from '@/features/home-discovery/analytics';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

vi.mock('next/dynamic', () => ({
  default: () => () => null
}));

const mockStoreState = {
  userLocation: { lat: 9.9, lng: -84.1 },
  customerName: '',
  fromNumber: '',
  customerAddress: null as null | {
    customerId?: string;
    urlAddress: string;
    buildingType: 'Apartment' | 'Residential Building' | 'Hotel' | 'Office Building' | 'Other';
    unitDetails?: string;
    deliveryNotes: string;
    lat?: number;
    lng?: number;
    formattedAddress?: string;
    placeId?: string;
  },
  profilePromptDismissedAt: null as number | null,
  setCustomerName: vi.fn(),
  setFromNumber: vi.fn(),
  setCustomerAddress: vi.fn(),
  setOnboarded: vi.fn(),
  setUserLocation: vi.fn(),
  setProfilePromptDismissedAt: vi.fn()
};

vi.mock('@/store', () => ({
  useCartStore: () => mockStoreState
}));

vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [{ id: 'c-1', name: 'Sushi' }],
    loading: false
  })
}));

const stableFetchSuggestions = vi.fn().mockResolvedValue([]);
const stableRefetch = vi.fn();

vi.mock('@/hooks/useRestaurants', () => ({
  useRestaurants: () => ({
    restaurants: [],
    loading: false,
    error: null,
    refetch: stableRefetch,
    fetchSuggestions: stableFetchSuggestions
  })
}));

vi.mock('@/features/home-discovery/hooks/useHomeRails', () => ({
  useHomeRails: () => []
}));

vi.mock('@/components/LoadingScreen', () => ({
  default: () => <div>Loading</div>
}));

vi.mock('@/components/ProfileCompletionPrompt', () => ({
  default: ({ visible, onCompleteNow, onLater }: any) => visible ? (
    <div>
      <button type="button" onClick={onCompleteNow}>Complete now</button>
      <button type="button" onClick={onLater}>Later</button>
    </div>
  ) : null
}));

vi.mock('@/components/ProfileCompletionModal', () => ({
  default: ({ isOpen, onContinue, onRequestLocation, onEnterAddressManually, onClose }: any) => isOpen ? (
    <div>
      <button type="button" onClick={() => onContinue({ name: 'Ivan Mora', phone: '88881234' })}>Continue</button>
      <button type="button" onClick={onRequestLocation}>Permitir ubicación</button>
      <button type="button" onClick={onEnterAddressManually}>Enter address manually</button>
      <button type="button" onClick={onClose}>Later</button>
    </div>
  ) : null
}));

vi.mock('@/components/AddressDetailsModal', () => ({
  BuildingType: {} as any,
  default: ({ isOpen, onSave, onClose }: any) => isOpen ? (
    <div>
      <button
        type="button"
        onClick={() => onSave({
          urlAddress: 'https://www.google.com/maps/search/?api=1&query=9.9,-84.1',
          buildingType: 'Apartment',
          unitDetails: '2A',
          deliveryNotes: 'Meet at door',
          lat: 9.9,
          lng: -84.1,
          formattedAddress: 'San José, Costa Rica',
          placeId: 'place-xyz',
        })}
      >
        Save Address
      </button>
      <button type="button" onClick={onClose}>Close Address</button>
    </div>
  ) : null
}));

vi.mock('@/features/home-discovery/components/HomeHeroSearch', () => ({
  default: (props: any) => (
    <div>
      {props.profilePrompt}
      <input
        aria-label="Buscar restaurantes o comida"
        value={props.searchQuery}
        onChange={(event) => props.onSearchQueryChange(event.target.value)}
      />
    </div>
  )
}));

vi.mock('@/features/home-discovery/components/IntentChipsBar', () => ({
  default: () => <div>Intents</div>
}));

vi.mock('@/components/CategoryBar', () => ({
  default: () => <div>Categories</div>
}));

vi.mock('@/features/home-discovery/components/RestaurantRail', () => ({
  default: () => null
}));

vi.mock('@/features/home-discovery/analytics', () => ({
  emitHomeEvent: vi.fn()
}));

describe('HomePage onboarding redesign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stableFetchSuggestions.mockReset().mockResolvedValue([]);
    mockStoreState.customerName = '';
    mockStoreState.fromNumber = '';
    mockStoreState.customerAddress = null;
    mockStoreState.profilePromptDismissedAt = null;

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.startsWith('/api/customer/address') && (!init || init.method === undefined || init.method === 'GET')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ address: null })
        } as any;
      }

      if (url === '/api/customer/profile') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ customerId: 'cust-1' })
        } as any;
      }

      if (url === '/api/customer/address' && init?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            address: {
              id: 'addr-1',
              customer_id: 'cust-1',
              url_address: 'https://www.google.com/maps/search/?api=1&query=9.9,-84.1',
              building_type: 'Apartment',
              unit_details: '2A',
              delivery_notes: 'Meet at door',
              lat: 9.9,
              lng: -84.1,
              formatted_address: 'San José, Costa Rica',
              place_id: 'place-xyz',
            }
          })
        } as any;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({})
      } as any;
    }) as any);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows prompt while home remains visible', () => {
    render(<HomePage />);

    expect(screen.getByRole('button', { name: 'Complete now' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpiar todo' })).toBeInTheDocument();
  });

  it('saves profile fields from modal flow', async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    await user.click(screen.getByRole('button', { name: 'Complete now' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(mockStoreState.setCustomerName).toHaveBeenCalledWith('Ivan Mora');
      expect(mockStoreState.setFromNumber).toHaveBeenCalledWith('88881234');
      expect(mockStoreState.setOnboarded).toHaveBeenCalledWith(true);
    });
  });

  it('supports manual address save fallback and tracks analytics', async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    await user.click(screen.getByRole('button', { name: 'Complete now' }));
    await user.click(screen.getByRole('button', { name: 'Enter address manually' }));
    await user.click(screen.getByRole('button', { name: 'Save Address' }));

    await waitFor(() => {
      expect(mockStoreState.setCustomerAddress).toHaveBeenCalled();
      expect(emitHomeEvent).toHaveBeenCalledWith(expect.objectContaining({ name: 'address_form_save_success' }));
    });

    const postCall = vi.mocked(fetch).mock.calls.find(([url, init]) => url === '/api/customer/address' && init?.method === 'POST');
    const payload = JSON.parse(String(postCall?.[1]?.body || '{}'));
    expect(payload.lat).toBe(9.9);
    expect(payload.lng).toBe(-84.1);
    expect(payload.placeId).toBe('place-xyz');
  });
});
