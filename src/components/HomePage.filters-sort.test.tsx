import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from './HomePage';
import { emitHomeEvent } from '@/features/home-discovery/analytics';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn()
  })
}));

vi.mock('next/dynamic', () => ({
  default: () => () => null
}));

vi.mock('@/store', () => ({
  useCartStore: () => ({
    userLocation: { lat: 9.9, lng: -84.1 },
    customerName: 'Ivan',
    fromNumber: '88881234',
    customerAddress: {
      customerId: 'cust-1',
      urlAddress: 'https://www.google.com/maps/search/?api=1&query=9.9,-84.1',
      buildingType: 'Apartment',
      deliveryNotes: 'Meet at door'
    },
    profilePromptDismissedAt: null,
    setCustomerName: vi.fn(),
    setFromNumber: vi.fn(),
    setCustomerAddress: vi.fn(),
    setOnboarded: vi.fn(),
    setUserLocation: vi.fn(),
    setProfilePromptDismissedAt: vi.fn()
  })
}));

vi.mock('@/lib/client-auth', () => ({
  getAccessToken: vi.fn(async () => null),
  getAuthenticatedJsonHeaders: vi.fn(async () => ({
    'Content-Type': 'application/json',
  })),
}));

vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [],
    loading: false
  })
}));

vi.mock('@/hooks/useRestaurants', () => ({
  useRestaurants: () => ({
    restaurants: [],
    loading: false,
    error: null,
    refetch: vi.fn()
  })
}));

vi.mock('@/features/home-discovery/hooks/useHomeRails', () => ({
  useHomeRails: () => []
}));

vi.mock('@/features/home-discovery/hooks/useHomeAddressRecovery', () => ({
  useHomeAddressRecovery: () => ({
    addressInitialPosition: null,
    handleDismissProfilePrompt: vi.fn(),
    handleOpenProfileCompletion: vi.fn(),
    handleRequestLocationFromProfile: vi.fn(),
    handleSaveAddress: vi.fn(),
    isAddressModalOpen: false,
    locationRequestLoading: false,
    setIsAddressModalOpen: vi.fn(),
  }),
}));

vi.mock('@/components/ProfileCompletionPrompt', () => ({
  default: () => null,
}));

vi.mock('@/components/BottomNav', () => ({
  default: () => null,
}));

vi.mock('@/components/UserOnboardingModal', () => ({
  default: () => null
}));

vi.mock('@/components/LoadingScreen', () => ({
  default: () => <div>Loading</div>
}));

vi.mock('@/features/home-discovery/components/HomeHeroSearch', () => ({
  default: () => <div>Hero</div>
}));

vi.mock('@/features/home-discovery/components/IntentChipsBar', () => ({
  default: ({ children, onOpenFilters }: any) => (
    <div>
      <button type="button" onClick={onOpenFilters}>Open filters</button>
      {children}
    </div>
  )
}));

vi.mock('@/components/CategoryBar', () => ({
  default: () => <div>Categories</div>
}));

vi.mock('@/features/home-discovery/components/RestaurantRail', () => ({
  default: () => null
}));

vi.mock('@/features/home-discovery/flags', () => ({
  getHomeFeatureFlags: () => ({
    home_intent_rails: false,
    home_price_compare: false,
    home_discovery_chat: false,
    home_visual_hierarchy_v2: false,
    home_state_polish_v1: false,
    home_filters_sort_v1: true,
    home_personalized_rails_v1: false,
    home_search_suggestions_v1: true
  })
}));

vi.mock('@/features/home-discovery/experiments', () => ({
  getHomeExperimentContext: () => ({
    experiment_id: 'test',
    variant_id: 'rails_only',
    geo_bucket: 'test',
    session_type: 'new'
  }),
  resolveHomeFeatureFlags: (flags: {
    home_intent_rails: boolean;
    home_price_compare: boolean;
    home_discovery_chat: boolean;
    home_visual_hierarchy_v2: boolean;
    home_state_polish_v1: boolean;
    home_filters_sort_v1: boolean;
    home_personalized_rails_v1: boolean;
    home_search_suggestions_v1: boolean;
  }) => flags,
  resolveHomeLayoutMode: () => 'intent_rails'
}));

vi.mock('@/features/home-discovery/analytics', () => ({
  emitHomeEvent: vi.fn()
}));

describe('HomePage filters and sort controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ address: null }),
    })) as any);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('supports chip toggle, sort change, clear-all, and keyboard interaction', async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    const budgetChip = screen.getByRole('button', { name: 'Económico' });
    expect(budgetChip).toHaveAttribute('aria-pressed', 'false');

    budgetChip.focus();
    await user.keyboard('{Enter}');

    expect(budgetChip).toHaveAttribute('aria-pressed', 'true');
    expect(emitHomeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'home_filter_apply',
        filter_key: 'price_band'
      })
    );

    await user.click(screen.getByRole('button', { name: 'Open filters' }));
    await user.selectOptions(screen.getByLabelText('Ordenar por'), 'fastest');
    expect(emitHomeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'home_sort_change',
        sort_by: 'fastest'
      })
    );

    await user.click(screen.getByRole('button', { name: 'Limpiar todos los filtros' }));
    expect(emitHomeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'home_filter_clear'
      })
    );
  });
});
