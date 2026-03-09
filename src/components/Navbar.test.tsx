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

describe('Navbar banner cues', () => {
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

  it('renders the order status cue and supports open and dismiss actions', async () => {
    const clickDetails: Array<Record<string, unknown>> = [];
    const dismissDetails: Array<Record<string, unknown>> = [];

    const handleClick = (event: Event) => clickDetails.push((event as CustomEvent).detail);
    const handleDismiss = (event: Event) => dismissDetails.push((event as CustomEvent).detail);

    window.addEventListener('fast-eat:order_status_notification_click', handleClick as EventListener);
    window.addEventListener('fast-eat:order_status_notification_dismiss', handleDismiss as EventListener);

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

    expect(await screen.findByText('statusCueDescriptions.ready')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'trackOrders' })[0]);
    expect(baseProps.onShowHistory).toHaveBeenCalledTimes(1);
    expect(clickDetails).toEqual([
      { orderId: 'order-123', statusCode: 'READY', source: 'navbar_status_cue' },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss order status notification' }));

    await waitFor(() => {
      expect(screen.queryByText('statusCueDescriptions.ready')).not.toBeInTheDocument();
    });

    expect(dismissDetails).toEqual([
      { orderId: 'order-123', statusCode: 'READY', source: 'navbar_status_cue' },
    ]);

    window.removeEventListener('fast-eat:order_status_notification_click', handleClick as EventListener);
    window.removeEventListener('fast-eat:order_status_notification_dismiss', handleDismiss as EventListener);
  });

  it('renders the bid cue and keeps open and dismiss behavior intact', async () => {
    const dismissDetails: Array<Record<string, unknown>> = [];
    const handleDismiss = (event: Event) => dismissDetails.push((event as CustomEvent).detail);

    window.addEventListener('fast-eat:bid_notification_dismiss', handleDismiss as EventListener);

    storeState.bidNotifications = [
      {
        id: 'bid-1',
        orderId: 'order-1',
        bid: {
          bidAmount: 2900,
        },
        read: false,
      },
    ];

    const { rerender } = render(<Navbar {...baseProps} />);

    expect(await screen.findByText(/Orden #order-1/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'openOfferNotifications' })[0]);

    expect(storeState.markBidNotificationRead).toHaveBeenCalledWith('bid-1');
    expect(storeState.setDeepLinkTarget).toHaveBeenCalledWith({ orderId: 'order-1', bidId: 'bid-1' });
    expect(baseProps.onShowHistory).toHaveBeenCalledTimes(1);

    storeState.bidNotifications = [
      {
        id: 'bid-2',
        orderId: 'order-2',
        bid: {
          bidAmount: 3100,
        },
        read: false,
      },
    ];

    rerender(<Navbar {...baseProps} />);

    expect(await screen.findByText(/Orden #order-2/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss bid notification' }));

    await waitFor(() => {
      expect(screen.queryByText(/Orden #order-2/i)).not.toBeInTheDocument();
    });

    expect(storeState.markBidNotificationRead).toHaveBeenCalledWith('bid-2');
    expect(dismissDetails).toEqual([
      { orderId: 'order-2', bidId: 'bid-2', source: 'navbar_cue' },
    ]);

    window.removeEventListener('fast-eat:bid_notification_dismiss', handleDismiss as EventListener);
  });
});

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

    const trayToggleButton = screen.getAllByRole('button', { name: 'openOfferNotifications' })[1];

    fireEvent.click(trayToggleButton);
    expect(screen.getByText('order-notifications-tray')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'openOfferNotifications' })[1]);
    expect(screen.queryByText('order-notifications-tray')).not.toBeInTheDocument();
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