import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CartsPageContent from './CartsPageContent';
import type { PersistedCartRecord } from '@/types';

const push = vi.fn();
const replaceActiveOrders = vi.fn();
const setCustomerId = vi.fn();
const restorePersistedCart = vi.fn();
const setSavedCarts = vi.fn();
const upsertSavedCart = vi.fn();
const removeSavedCart = vi.fn();
const setSavedCartsHydrated = vi.fn();
const setSavedCartsError = vi.fn();
const fetchSavedCarts = vi.fn();
const saveCurrentCart = vi.fn();
const fetchSavedCartById = vi.fn();
const archiveSavedCart = vi.fn();

const savedCartFixture: PersistedCartRecord = {
  id: 'cart-1',
  customerId: 'customer-1',
  restaurantId: 'restaurant-1',
  branchId: 'branch-1',
  restaurantSlug: 'sumo-sushi',
  restaurantName: 'Sumo Sushi',
  branchName: 'Sumo Escazu',
  itemCount: 2,
  subtotal: 9000,
  isActive: true,
  cartItems: [
    { id: 'item-1', name: 'Roll', description: '', image: '', price: 4500, category: 'Sushi', quantity: 2, notes: '' },
  ],
  checkoutDraft: {
    customerName: 'Ivan',
    customerPhone: '50688888888',
    paymentMethod: 'cash',
    orderType: 'delivery',
    source: 'client',
  },
  restaurantSnapshot: { id: 'branch-1', name: 'Sumo Sushi' } as any,
  metadata: {},
  createdAt: '2026-03-06T00:00:00.000Z',
  updatedAt: '2026-03-06T00:00:00.000Z',
  lastRestoredAt: null,
  storageSource: 'database',
};

const mockState = {
  items: [],
  branchId: 'branch-1',
  restaurantInfo: { id: 'branch-1', name: 'Sumo Sushi' },
  checkoutDraft: {
    customerName: '',
    customerPhone: '',
    paymentMethod: 'cash',
    orderType: 'delivery',
    source: 'client',
  },
  activeOrders: {},
  fromNumber: '50688888888',
  customerId: '',
  customerName: 'Ivan',
  groupSessionId: null,
  groupParticipants: [],
  savedCarts: [],
  savedCartsHydrated: false,
  savedCartsError: null,
  replaceActiveOrders,
  restorePersistedCart,
  setCustomerId,
  setSavedCarts,
  upsertSavedCart,
  removeSavedCart,
  setSavedCartsHydrated,
  setSavedCartsError,
};

vi.mock('@/hooks/useAppRouter', () => ({
  useAppRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/store', () => ({
  useCartStore: (selector?: (state: typeof mockState) => unknown) => selector ? selector(mockState) : mockState,
}));

vi.mock('@/components/BottomNav', () => ({
  default: () => <div>bottom-nav</div>,
}));

vi.mock('@/services/api', () => ({
  fetchSavedCarts: (...args: any[]) => fetchSavedCarts(...args),
  saveCurrentCart: (...args: any[]) => saveCurrentCart(...args),
  fetchSavedCartById: (...args: any[]) => fetchSavedCartById(...args),
  archiveSavedCart: (...args: any[]) => archiveSavedCart(...args),
}));

describe('CartsPageContent', () => {
  beforeEach(() => {
    mockState.items = [];
    mockState.checkoutDraft = {
      customerName: '',
      customerPhone: '',
      paymentMethod: 'cash',
      orderType: 'delivery',
      source: 'client',
    };
    mockState.activeOrders = {};
    mockState.fromNumber = '50688888888';
    mockState.customerId = '';
    mockState.customerName = 'Ivan';
    mockState.groupSessionId = null;
    mockState.groupParticipants = [];
    mockState.savedCarts = [];
    mockState.savedCartsHydrated = false;
    mockState.savedCartsError = null;
    replaceActiveOrders.mockReset();
    setCustomerId.mockReset();
    restorePersistedCart.mockReset();
    setSavedCarts.mockReset();
    upsertSavedCart.mockReset();
    removeSavedCart.mockReset();
    setSavedCartsHydrated.mockReset();
    setSavedCartsError.mockReset();
    push.mockReset();
    fetchSavedCarts.mockReset();
    saveCurrentCart.mockReset();
    fetchSavedCartById.mockReset();
    archiveSavedCart.mockReset();
    fetchSavedCarts.mockResolvedValue([]);
    setSavedCarts.mockImplementation((carts: PersistedCartRecord[]) => {
      mockState.savedCarts = carts;
    });
    upsertSavedCart.mockImplementation((cart: PersistedCartRecord) => {
      mockState.savedCarts = [cart, ...mockState.savedCarts.filter((entry) => entry.id !== cart.id)];
    });
    removeSavedCart.mockImplementation((cartId: string) => {
      mockState.savedCarts = mockState.savedCarts.filter((entry) => entry.id !== cartId);
    });
    setSavedCartsHydrated.mockImplementation((value: boolean) => {
      mockState.savedCartsHydrated = value;
    });
    setSavedCartsError.mockImplementation((value: string | null) => {
      mockState.savedCartsError = value;
    });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ activeOrders: [], pastOrders: [] }) })) as typeof fetch);
  });

  it('renders the empty state when there is no cart and no active orders', async () => {
    render(<CartsPageContent />);

    await waitFor(() => {
      expect(screen.getByText('Aquí aparecerán tus carritos activos y pedidos en curso.')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Explorar restaurantes' })).toBeInTheDocument();
  });

  it('shows the current cart summary and checkout action', async () => {
    mockState.items = [
      { id: 'item-1', name: 'Roll', description: '', image: '', price: 4500, category: 'Sushi', quantity: 2, notes: '' },
    ];

    render(<CartsPageContent />);

    expect(await screen.findByText('Tu carrito actual')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar al checkout' })).toBeInTheDocument();
    expect(screen.getByText(/₡9\s?000/)).toBeInTheDocument();
  });

  it('saves the current cart using the real checkout draft merged with customer data', async () => {
    mockState.items = [
      { id: 'item-1', name: 'Roll', description: '', image: '', price: 4500, category: 'Sushi', quantity: 2, notes: '' },
    ];
    mockState.checkoutDraft = {
      customerName: '',
      customerPhone: '',
      paymentMethod: 'cash',
      orderType: 'delivery',
      source: 'client',
    };
    saveCurrentCart.mockResolvedValue(savedCartFixture);

    render(<CartsPageContent />);

    fireEvent.click(await screen.findByRole('button', { name: 'Guardar carrito actual' }));

    await waitFor(() => {
      expect(saveCurrentCart).toHaveBeenCalledWith({
        branchId: 'branch-1',
        cartItems: mockState.items,
        checkoutDraft: {
          customerName: 'Ivan',
          customerPhone: '50688888888',
          paymentMethod: 'cash',
          orderType: 'delivery',
          source: 'client',
        },
        restaurantSnapshot: mockState.restaurantInfo,
        metadata: {
          savedFrom: 'carts-page',
          isGroupCart: false,
        },
      });
    });

    expect(await screen.findByText('Sumo Escazu')).toBeInTheDocument();
  });

  it('restores a saved cart and navigates to the restaurant slug', async () => {
    fetchSavedCarts.mockResolvedValue([savedCartFixture]);
    fetchSavedCartById.mockResolvedValue(savedCartFixture);

    render(<CartsPageContent />);

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir carrito' }));

    await waitFor(() => {
      expect(restorePersistedCart).toHaveBeenCalledWith({
        branchId: 'branch-1',
        items: savedCartFixture.cartItems,
        checkoutDraft: savedCartFixture.checkoutDraft,
        restaurantInfo: savedCartFixture.restaurantSnapshot,
        customerName: 'Ivan',
        customerPhone: '50688888888',
      });
    });

    expect(push).toHaveBeenCalledWith('/sumo-sushi');
  });

  it('archives a saved cart and removes it from the list', async () => {
    fetchSavedCarts.mockResolvedValue([savedCartFixture]);
    archiveSavedCart.mockResolvedValue(undefined);

    render(<CartsPageContent />);

    expect(await screen.findByText('Sumo Escazu')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Archivar carrito' }));

    await waitFor(() => {
      expect(archiveSavedCart).toHaveBeenCalledWith('cart-1');
      expect(screen.queryByText('Sumo Escazu')).not.toBeInTheDocument();
    });
  });

  it('renders active tracked orders returned by the API', async () => {
    mockState.customerId = 'customer-1';
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        customerId: 'customer-1',
        activeOrders: [
          {
            id: 'order-1',
            customerId: 'customer-1',
            orderNumber: 'A-101',
            branchId: 'branch-1',
            statusCode: 'PREPARING',
            statusLabel: 'En preparación',
            total: 6200,
            customerTotal: 6200,
            securityCode: null,
            createdAt: '2026-03-06T12:00:00.000Z',
            items: [],
            restaurant: { id: 'branch-1', name: 'Sumo Sushi', logo_url: null },
          },
        ],
        pastOrders: [],
      }),
    })) as typeof fetch);

    render(<CartsPageContent />);

    expect(await screen.findByText('A-101')).toBeInTheDocument();
    expect(screen.getByText('En preparación')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver pedido' })).toBeInTheDocument();
  });
});