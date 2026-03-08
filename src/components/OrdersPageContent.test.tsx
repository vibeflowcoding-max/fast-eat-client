import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OrdersPageContent from './OrdersPageContent';

const push = vi.fn();
const replaceActiveOrders = vi.fn();
const setCustomerId = vi.fn();
const clearCart = vi.fn();

const mockState = {
  activeOrders: {},
  bidsByOrderId: {},
  fromNumber: '50688888888',
  customerId: '',
  branchId: 'branch-1',
  setCustomerId,
  replaceActiveOrders,
  clearCart,
};

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/components/BottomNav', () => ({
  default: () => <div>bottom-nav</div>,
}));

vi.mock('@/hooks/useAppRouter', () => ({
  useAppRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/store', () => ({
  useCartStore: (selector?: (state: typeof mockState) => unknown) => selector ? selector(mockState) : mockState,
}));

vi.mock('@/hooks/useOrderTracking', () => ({
  useOrderTracking: vi.fn(),
}));

describe('OrdersPageContent', () => {
  beforeEach(() => {
    mockState.activeOrders = {};
    mockState.bidsByOrderId = {};
    mockState.customerId = '';
    replaceActiveOrders.mockReset();
    setCustomerId.mockReset();
    clearCart.mockReset();
    push.mockReset();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ activeOrders: [], pastOrders: [] }) })) as typeof fetch);
  });

  it('renders the empty active orders state and start ordering CTA', async () => {
    render(<OrdersPageContent />);

    expect(await screen.findByText('activeEmpty')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'startOrdering' })).toBeInTheDocument();
  });

  it('renders active and past orders from the API', async () => {
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
            bidCount: 2,
            bestBid: 1800,
            securityCode: null,
            createdAt: '2026-03-08T12:00:00.000Z',
            items: [],
            restaurant: { id: 'branch-1', name: 'Sumo Sushi', logo_url: null },
          },
        ],
        pastOrders: [
          {
            id: 'order-2',
            customerId: 'customer-1',
            orderNumber: 'A-099',
            branchId: 'branch-1',
            statusCode: 'COMPLETED',
            statusLabel: 'Completado',
            total: 5100,
            bidCount: 0,
            bestBid: null,
            securityCode: null,
            createdAt: '2026-03-07T12:00:00.000Z',
            items: [],
            restaurant: { id: 'branch-1', name: 'Sumo Sushi', logo_url: null },
          },
        ],
      }),
    })) as typeof fetch);

    render(<OrdersPageContent />);

    expect(await screen.findByText('A-101')).toBeInTheDocument();
    expect(screen.getByText('En preparación')).toBeInTheDocument();
    expect(screen.getByText('A-099')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'rateOrder' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'repeatOrder' })).toBeInTheDocument();
  });

  it('routes past order actions without triggering the card navigation handler twice', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        customerId: 'customer-1',
        activeOrders: [],
        pastOrders: [
          {
            id: 'order-2',
            customerId: 'customer-1',
            orderNumber: 'A-099',
            branchId: 'branch-1',
            statusCode: 'COMPLETED',
            statusLabel: 'Completado',
            total: 5100,
            bidCount: 0,
            bestBid: null,
            securityCode: null,
            createdAt: '2026-03-07T12:00:00.000Z',
            items: [],
            restaurant: { id: 'branch-1', name: 'Sumo Sushi', logo_url: null },
          },
        ],
      }),
    })) as typeof fetch);

    render(<OrdersPageContent />);

    fireEvent.click(await screen.findByRole('button', { name: 'rateOrder' }));
    fireEvent.click(screen.getByRole('button', { name: 'repeatOrder' }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/orders/order-2?customerId=customer-1#reviews');
      expect(push).toHaveBeenCalledWith('/');
    });
  });
});