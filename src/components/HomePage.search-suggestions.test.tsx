import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const mockCategories = [
  { id: 'c-1', name: 'Sushi' },
  { id: 'c-2', name: 'Pizza' }
];

vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    categories: mockCategories,
    loading: false
  })
}));

const mockFetchSuggestions = vi.fn();
const mockRestaurantsState = {
  restaurants: [] as Array<any>,
  loading: false,
  error: null as string | null,
  refetch: vi.fn(),
  fetchSuggestions: mockFetchSuggestions
};

vi.mock('@/hooks/useRestaurants', () => ({
  useRestaurants: () => mockRestaurantsState
}));

vi.mock('@/features/home-discovery/hooks/useHomeRails', () => ({
  useHomeRails: () => []
}));

vi.mock('@/components/UserOnboardingModal', () => ({
  default: () => null
}));

vi.mock('@/components/LoadingScreen', () => ({
  default: () => <div>Loading</div>
}));

vi.mock('@/features/home-discovery/components/HomeHeroSearch', () => ({
  default: (props: any) => (
    <div>
      <input
        aria-label="Buscar restaurantes o comida"
        value={props.searchQuery}
        onChange={(event) => props.onSearchQueryChange(event.target.value)}
      />

      {props.showSuggestions && (
        <div>
          {props.suggestions?.map((suggestion: any) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => props.onSuggestionSelect?.(suggestion)}
            >
              suggestion-{suggestion.label}
            </button>
          ))}
        </div>
      )}

      {props.showRecovery && (
        <div>
          {props.recoveryAlternatives?.map((item: any) => (
            <button
              key={item.id}
              type="button"
              onClick={() => props.onRecoveryAlternativeSelect?.(item.id)}
            >
              alternative-{item.label}
            </button>
          ))}
          {props.recoveryCategories?.map((item: any) => (
            <button
              key={item.id}
              type="button"
              onClick={() => props.onRecoveryCategorySelect?.(item.label)}
            >
              category-{item.label}
            </button>
          ))}
          <button type="button" onClick={props.onClearSearch}>clear-search</button>
        </div>
      )}
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

describe('HomePage search suggestions and recovery', () => {
  const restaurantA = {
    id: 'r-1',
    name: 'Sushi Place',
    slug: 'sushi-place',
    logo_url: null,
    description: null,
    is_active: true,
    distance: 0.5,
    eta_min: 25,
    branches: [],
    categories: [{ id: 'c-1', name: 'Sushi', description: null, icon: '🍣' }]
  };

  const restaurantB = {
    id: 'r-2',
    name: 'Pizza Spot',
    slug: 'pizza-spot',
    logo_url: null,
    description: null,
    is_active: true,
    distance: 1.3,
    eta_min: 33,
    branches: [],
    categories: [{ id: 'c-2', name: 'Pizza', description: null, icon: '🍕' }]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mockFetchSuggestions.mockReset();
    mockRestaurantsState.restaurants = [restaurantA, restaurantB];
    mockRestaurantsState.loading = false;
    mockRestaurantsState.error = null;
    mockFetchSuggestions.mockResolvedValue([restaurantA]);
  });

  const waitForDebounce = async (ms = 320) => {
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    });
  };

  it('debounces suggestion fetching before calling network layer', async () => {
    render(<HomePage />);

    fireEvent.change(screen.getByLabelText('Buscar restaurantes o comida'), {
      target: { value: 'su' }
    });

    expect(mockFetchSuggestions).not.toHaveBeenCalled();

    await waitForDebounce(150);
    expect(mockFetchSuggestions).not.toHaveBeenCalled();

    await waitForDebounce();

    await waitFor(() => {
      expect(mockFetchSuggestions).toHaveBeenCalledWith('su', expect.any(AbortSignal));
    });
  });

  it('emits analytics when selecting a suggestion', async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    fireEvent.change(screen.getByLabelText('Buscar restaurantes o comida'), {
      target: { value: 'su' }
    });

    await user.click(await screen.findByRole('button', { name: 'suggestion-Sushi Place' }));

    expect(emitHomeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'home_search_suggestion_select',
        suggestion_kind: 'restaurant'
      })
    );
  });

  it('emits analytics for no-results recovery actions', async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    fireEvent.change(screen.getByLabelText('Buscar restaurantes o comida'), {
      target: { value: 'zzzz' }
    });

    await user.click(await screen.findByRole('button', { name: 'alternative-Sushi Place' }));
    expect(emitHomeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'home_search_no_results_recovery_click',
        action: 'alternative_restaurant'
      })
    );

    fireEvent.change(screen.getByLabelText('Buscar restaurantes o comida'), {
      target: { value: 'zzzz' }
    });

    await user.click(await screen.findByRole('button', { name: 'category-Sushi' }));
    expect(emitHomeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'home_search_no_results_recovery_click',
        action: 'popular_category'
      })
    );

    fireEvent.change(screen.getByLabelText('Buscar restaurantes o comida'), {
      target: { value: 'zzzz' }
    });

    await user.click(await screen.findByRole('button', { name: 'clear-search' }));
    expect(emitHomeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'home_search_no_results_recovery_click',
        action: 'clear_search'
      })
    );
  });
});
