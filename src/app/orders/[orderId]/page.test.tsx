import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OrderDetailPage from './page';

const push = vi.fn();
const submitRestaurantReview = vi.fn();
const submitDeliveryReview = vi.fn();
const fetchOrderTracking = vi.fn();

const orderPayload = {
  order: {
    id: 'order-1',
    orderNumber: 'ORDER_9',
    statusCode: 'PENDING',
    statusLabel: 'Pending',
    total: 8200,
    subtotal: 7000,
    deliveryFee: 800,
    feesTotal: 400,
    customerTotal: 8200,
    createdAt: '2026-03-03T17:34:58.000Z',
    items: [
      {
        name: 'Poke mixto',
        quantity: 2,
        price: 3500,
        notes: 'Sin cebolla',
        variant_name: 'Grande',
        modifiers: [{ name: 'Aguacate', quantity: 1 }],
      },
    ],
    deliveryAddress: 'San Jose centro',
    notes: 'Llamar al llegar',
    estimatedTime: 30,
    paymentMethod: 'SINPE',
    branchId: 'branch-1',
    restaurant: { id: 'branch-1', name: 'Dulce Cafe', logo_url: null },
    acceptedDeliveryBid: { id: 'bid-accepted', driverId: 'driver-1' },
    bids: [
      {
        id: 'bid-1',
        status: 'accepted',
        driverId: 'driver-1',
        driverOffer: 1800,
        basePrice: 1500,
        finalPrice: 1800,
        estimatedTimeMinutes: 24,
        driverNotes: 'Voy saliendo',
        driverRatingSnapshot: 4.9,
        createdAt: '2026-03-03T17:40:00.000Z',
        expiresAt: null,
        acceptedAt: '2026-03-03T17:41:00.000Z',
        rejectedAt: null,
      },
    ],
  },
};

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ orderId: 'order-1' }),
  useSearchParams: () => ({ get: (key: string) => (key === 'customerId' ? 'customer-1' : null) }),
}));

vi.mock('@/components/BottomNav', () => ({
  default: () => <div>bottom-nav</div>,
}));

vi.mock('@/hooks/useAppRouter', () => ({
  useAppRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/store', () => ({
  useCartStore: () => ({ fromNumber: '50688888888', customerId: 'customer-1' }),
}));

vi.mock('@/features/reviews/components/ReviewCard', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/features/reviews/hooks/useOrderReviewEligibility', () => ({
  useOrderReviewEligibility: () => ({
    loading: false,
    error: null,
    refresh: vi.fn(),
    eligibility: {
      reasons: { restaurant: [], delivery: [] },
      existing: { restaurant: null, delivery: null },
      canReviewRestaurant: true,
      canReviewDelivery: true,
      targets: { driverId: 'driver-1', acceptedBidId: 'bid-accepted' },
    },
  }),
}));

vi.mock('@/features/reviews/hooks/useSubmitRestaurantReview', () => ({
  useSubmitRestaurantReview: () => ({ submitting: false, error: null, submit: submitRestaurantReview }),
}));

vi.mock('@/features/reviews/hooks/useSubmitDeliveryReview', () => ({
  useSubmitDeliveryReview: () => ({ submitting: false, error: null, submit: submitDeliveryReview }),
}));

vi.mock('@/services/api', () => ({
  fetchOrderTracking: (...args: unknown[]) => fetchOrderTracking(...args),
}));

describe('OrderDetailPage', () => {
  beforeEach(() => {
    push.mockReset();
    submitRestaurantReview.mockReset();
    submitDeliveryReview.mockReset();
    fetchOrderTracking.mockReset();
    fetchOrderTracking.mockResolvedValue({
      status: { code: 'courier_assigned', label: 'En camino' },
      eta: { minutes: 18 },
      courier: { assigned: true, freshness: 'Actualizado hace 1 min' },
      auction: { state: 'accepted', latestBid: { bidAmount: 1800 } },
      restaurant: { name: 'Dulce Cafe' },
      destination: { coordinates: { latitude: 9.93, longitude: -84.08 } },
      serviceMode: 'delivery',
    });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => orderPayload })) as typeof fetch);
  });

  it('renders the order summary, tracking, products, bids, and reviews', async () => {
    render(<OrderDetailPage />);

    expect(await screen.findByText('ORDER_9')).toBeInTheDocument();
    expect(screen.getAllByText('Dulce Cafe').length).toBeGreaterThan(0);
    expect(screen.getByText('Poke mixto')).toBeInTheDocument();
    expect(screen.getByText('Voy saliendo')).toBeInTheDocument();
    expect(screen.getByText('reviews.restaurantTitle')).toBeInTheDocument();
    expect(screen.getByText('En camino')).toBeInTheDocument();
  });

  it('routes back to the orders overview', async () => {
    render(<OrderDetailPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'back' }));

    expect(push).toHaveBeenCalledWith('/orders');
  });

  it('refreshes tracking when the action button is pressed', async () => {
    render(<OrderDetailPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Actualizar' }));

    await waitFor(() => {
      expect(fetchOrderTracking).toHaveBeenCalledWith('order-1');
      expect(fetchOrderTracking).toHaveBeenCalledTimes(2);
    });
  });
});