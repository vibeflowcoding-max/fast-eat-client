import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import Navbar from './Navbar';

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(async () => ({ data: { session: null } })),
}));

const storeState = {
  bidNotifications: [] as Array<any>,
  clientContext: null as any,
  hydrateClientContext: vi.fn(),
  markBidNotificationRead: vi.fn(),
  setDeepLinkTarget: vi.fn(),
};

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/store', () => ({
  useCartStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock('@/lib/audio', () => ({
  audioManager: {
    unlock: vi.fn(async () => undefined),
  },
}));

vi.mock('./SearchBar', () => ({
  default: () => <div>search-bar</div>,
}));

vi.mock('./OrderNotificationsTray', () => ({
  default: () => <div>order-notifications-tray</div>,
}));

const baseProps = {
  restaurantInfo: {
    id: 'rest-1',
    name: 'Sumo Sushi',
    description: 'Japanese food',
    category: 'Japonesa',
    address: 'San Jose',
    phone: '1111-1111',
    email: 'sumo@example.com',
    rating: 4.5,
    image_url: '',
    google_maps_url: '',
    opening_hours: {},
    payment_methods: [],
    service_modes: [],
    active: true,
    created_at: '',
    updated_at: '',
  },
  isTestMode: false,
  toggleTestMode: vi.fn(),
  onShowHistory: vi.fn(),
  onOpenCart: vi.fn(),
  totalItemsCount: 0,
  cartLength: 0,
  categories: ['Entradas'],
  activeCategory: 'Entradas',
  setActiveCategory: vi.fn(),
  tabsRef: { current: null },
  canScrollLeft: false,
  canScrollRight: false,
  scrollTabs: vi.fn(),
  onScroll: vi.fn(),
  isLoading: false,
  onOpenReviews: vi.fn(),
  onGoBack: vi.fn(),
  customerName: 'Ivan',
  searchQuery: '',
  setSearchQuery: vi.fn(),
};

describe('Navbar action buttons and cart', () => {
  beforeEach(() => {
    storeState.bidNotifications = [];
    storeState.clientContext = null;
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue({ data: { session: null } });
    storeState.hydrateClientContext.mockReset();
    storeState.markBidNotificationRead.mockReset();
    storeState.setDeepLinkTarget.mockReset();
    baseProps.onShowHistory.mockReset();
    baseProps.onGoBack.mockReset();
    baseProps.onOpenReviews.mockReset();
    baseProps.onOpenCart.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('wires the back, history, reviews, and cart actions', () => {
    render(
      <Navbar
        {...baseProps}
        totalItemsCount={2}
        cartLength={1}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'trackOrders' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'openRestaurantReviews' }));
    fireEvent.click(screen.getByRole('button', { name: 'myOrder' }));

    expect(baseProps.onGoBack).toHaveBeenCalledTimes(1);
    expect(baseProps.onShowHistory).toHaveBeenCalledTimes(1);
    expect(baseProps.onOpenReviews).toHaveBeenCalledTimes(1);
    expect(baseProps.onOpenCart).toHaveBeenCalledTimes(1);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows unread notification count and toggles the notifications tray', async () => {
    storeState.bidNotifications = [
      { id: 'bid-1', orderId: 'order-1', bid: { bidAmount: 1200 }, read: false },
    ];

    render(<Navbar {...baseProps} />);

    await waitFor(() => {
      expect(getSessionMock).toHaveBeenCalled();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
    expect(screen.queryByText('order-notifications-tray')).not.toBeInTheDocument();

    const trayToggleButton = screen.getByRole('button', { name: 'openOfferNotifications' });

    fireEvent.click(trayToggleButton);
    expect(screen.getByText('order-notifications-tray')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'openOfferNotifications' }));
    expect(screen.queryByText('order-notifications-tray')).not.toBeInTheDocument();
  });

  it('does not render inline status or offer banners on the screen', () => {
    storeState.bidNotifications = [
      { id: 'bid-1', orderId: 'order-1', bid: { bidAmount: 1200 }, read: false },
    ];

    render(<Navbar {...baseProps} />);

    act(() => {
      window.dispatchEvent(new CustomEvent('fast-eat:order_status_changed', {
        detail: {
          orderId: 'order-123',
          statusCode: 'READY',
          statusLabel: 'Ready',
          description: 'Tu pedido ya casi sale.',
        },
      }));
    });

    expect(screen.queryByText(/Orden #order-1/i)).not.toBeInTheDocument();
    expect(screen.queryByText('statusCueDescriptions.ready')).not.toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('dismisses the portal tray on outside pointerdown and restores focus to the trigger', async () => {
    storeState.bidNotifications = [
      { id: 'bid-1', orderId: 'order-1', bid: { bidAmount: 1200 }, read: false },
    ];

    render(<Navbar {...baseProps} />);

    const trayToggleButton = screen.getByRole('button', { name: 'openOfferNotifications' });

    fireEvent.click(trayToggleButton);

    const dialog = await screen.findByRole('dialog', { name: 'openOfferNotifications' });
    await waitFor(() => {
      expect(dialog).toHaveFocus();
    });

    fireEvent.pointerDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText('order-notifications-tray')).not.toBeInTheDocument();
    });

    expect(trayToggleButton).toHaveFocus();
  });

  it('dismisses the portal tray on Escape and restores focus to the trigger', async () => {
    storeState.bidNotifications = [
      { id: 'bid-1', orderId: 'order-1', bid: { bidAmount: 1200 }, read: false },
    ];

    render(<Navbar {...baseProps} />);

    const trayToggleButton = screen.getByRole('button', { name: 'openOfferNotifications' });

    fireEvent.click(trayToggleButton);

    await screen.findByRole('dialog', { name: 'openOfferNotifications' });
    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('order-notifications-tray')).not.toBeInTheDocument();
    });

    expect(trayToggleButton).toHaveFocus();
  });

  it('applies the empty-cart visual state when the cart has no items', () => {
    render(<Navbar {...baseProps} totalItemsCount={0} cartLength={0} />);

    const cartButton = screen.getByRole('button', { name: 'myOrder' });
    expect(cartButton.className).toContain('border-slate-200');
    expect(cartButton.className).not.toContain('bg-orange-600');
  });

  it('applies the active-cart visual state when the cart has items', () => {
    render(<Navbar {...baseProps} totalItemsCount={3} cartLength={2} />);

    const cartButton = screen.getByRole('button', { name: 'myOrder' });
    expect(cartButton.className).toContain('bg-orange-600');
    expect(cartButton.className).toContain('hover:scale-105');
  });

  it('toggles favorite optimistically and rolls back when the request fails', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false }));
    vi.stubGlobal('fetch', fetchMock);
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'token-1' } } });
    storeState.clientContext = { favorites: ['other-rest'] };

    render(<Navbar {...baseProps} />);

    const favoriteButton = screen.getByRole('button', { name: 'addFavoriteRestaurant' });
    fireEvent.click(favoriteButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/favorites', expect.objectContaining({ method: 'POST' }));
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'addFavoriteRestaurant' })).toBeInTheDocument();
    });

    expect(storeState.hydrateClientContext).toHaveBeenNthCalledWith(1, { favorites: ['other-rest', 'rest-1'] });
    expect(storeState.hydrateClientContext).toHaveBeenNthCalledWith(2, { favorites: ['other-rest'] });
  });

  it('turns the favorite heart red after a successful save', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.startsWith('/api/favorites?restaurantId=')) {
        return {
          ok: true,
          json: async () => ({ isFavorite: false }),
        };
      }

      return {
        ok: true,
        json: async () => ({ success: true, isFavorite: true }),
      };
    });

    vi.stubGlobal('fetch', fetchMock);
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'token-1' } } });
    storeState.clientContext = { favorites: [] };

    render(<Navbar {...baseProps} />);

    const favoriteButton = await screen.findByRole('button', { name: 'addFavoriteRestaurant' });
    fireEvent.click(favoriteButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/favorites', expect.objectContaining({ method: 'POST' }));
    });

    await waitFor(() => {
      const activeButton = screen.getByRole('button', { name: 'removeFavoriteRestaurant' });
      expect(activeButton.className).toContain('text-rose-600');
      expect(activeButton.className).toContain('bg-rose-50');
    });
  });
});

describe('Navbar category filters', () => {
  beforeEach(() => {
    storeState.bidNotifications = [];
    storeState.clientContext = null;
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue({ data: { session: null } });
    storeState.hydrateClientContext.mockReset();
    storeState.markBidNotificationRead.mockReset();
    storeState.setDeepLinkTarget.mockReset();
    baseProps.setActiveCategory.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('marks the active category and keeps inactive categories visually subdued', () => {
    render(
      <Navbar
        {...baseProps}
        activeCategory="Platos"
        categories={['Entradas', 'Platos', 'Bebidas']}
      />,
    );

    const activeButton = screen.getByRole('button', { name: 'Platos' });
    const inactiveButton = screen.getByRole('button', { name: 'Entradas' });

    expect(activeButton).toHaveAttribute('aria-current', 'page');
    expect(activeButton.className).toContain('text-white');
    expect(activeButton.className).toContain('scale-105');
    expect(activeButton.className).toContain('border-transparent');

    expect(inactiveButton).not.toHaveAttribute('aria-current');
    expect(inactiveButton.className).toContain('text-slate-500');
    expect(inactiveButton.className).toContain('border-slate-200');
  });

  it('updates the active category when a filter is clicked', () => {
    const setActiveCategory = vi.fn();

    render(
      <Navbar
        {...baseProps}
        activeCategory="Entradas"
        categories={['Entradas', 'Platos']}
        setActiveCategory={setActiveCategory}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Platos' }));

    expect(setActiveCategory).toHaveBeenCalledWith('Platos');
  });

  it('renders loading skeletons while categories are unavailable', () => {
    render(
      <Navbar
        {...baseProps}
        categories={[]}
        isLoading
      />,
    );

    expect(screen.getAllByTestId('category-skeleton')).toHaveLength(4);
  });
});