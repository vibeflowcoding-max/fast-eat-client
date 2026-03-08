import { render, screen } from '@testing-library/react';
import CheckoutPageContent from './CheckoutPageContent';

const push = vi.fn();

const mockState = {
  items: [],
  branchId: 'branch-1',
  checkoutDraft: {
    customerName: 'Test User',
    customerPhone: '50688888888',
    paymentMethod: 'cash',
    orderType: 'delivery',
    source: 'client',
    address: 'Address',
    gpsLocation: 'https://maps.google.com/?q=1,1',
    locationOverriddenFromProfile: false,
    locationDifferenceAcknowledged: false,
  },
  customerAddress: null,
  customerName: 'Test User',
  fromNumber: '50688888888',
  groupParticipants: [],
  groupSessionId: null,
  participantId: 'participant-1',
  restaurantInfo: {
    id: 'branch-1',
    name: 'Demo Restaurant',
    payment_methods: ['cash'],
    service_modes: ['delivery'],
  },
  setCheckoutDraft: vi.fn(),
  setCustomerAddress: vi.fn(),
  setRestaurantInfo: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn() }),
}));

vi.mock('@/store', () => ({
  useCartStore: (selector?: (state: typeof mockState) => unknown) => selector ? selector(mockState) : mockState,
}));

vi.mock('@/hooks/useCartActions', () => ({
  useCartActions: () => ({
    chefNotification: null,
    handlePlaceOrder: vi.fn(),
    isOrdering: false,
    isSyncing: false,
    setChefNotification: vi.fn(),
    syncCartAction: vi.fn(),
  }),
}));

vi.mock('@/services/api', () => ({
  fetchCheckoutContext: vi.fn(async () => ({
    restaurant: mockState.restaurantInfo,
    feeRates: { serviceFeeRate: 0, platformFeeRate: 0 },
    tableQuantity: 0,
    isTableAvailable: false,
  })),
}));

vi.mock('@/components/AddressDetailsModal', () => ({
  default: () => null,
}));

vi.mock('@/components/CartItemRow', () => ({
  default: ({ item }: { item: { name: string } }) => <div>{item.name}</div>,
}));

vi.mock('@/components/OrderForm', () => ({
  default: () => <div>order-form</div>,
}));

vi.mock('@/features/payments/components/BillSplitterModal', () => ({
  default: () => null,
}));

vi.mock('@/features/payments/components/SinpeRequestUI', () => ({
  default: () => null,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: null } })) } },
}));

describe('CheckoutPageContent', () => {
  beforeEach(() => {
    mockState.items = [];
    mockState.branchId = 'branch-1';
    mockState.groupParticipants = [];
    mockState.groupSessionId = null;
  });

  it('renders empty state when there are no checkout items', async () => {
    render(<CheckoutPageContent />);

    expect(await screen.findByText('No hay productos para confirmar')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Ir al menú' })).toBeInTheDocument();
  });

  it('shows split bill action for grouped carts with multiple participants', async () => {
    mockState.groupSessionId = 'group-1';
    mockState.groupParticipants = [
      {
        id: 'participant-1',
        name: 'Host',
        isHost: true,
        joinedAt: 1,
        items: [{ id: '1', name: 'Burger', description: '', image: '', price: 3000, category: 'Food', quantity: 1, notes: '' }],
      },
      {
        id: 'participant-2',
        name: 'Guest',
        isHost: false,
        joinedAt: 2,
        items: [{ id: '2', name: 'Drink', description: '', image: '', price: 1000, category: 'Drinks', quantity: 1, notes: '' }],
      },
    ];

    render(<CheckoutPageContent />);

    expect(await screen.findByRole('button', { name: 'Dividir cuenta' })).toBeInTheDocument();
    expect(await screen.findByText('order-form')).toBeInTheDocument();
  });

  it('shows recovery actions when checkout has no branch context', async () => {
    mockState.branchId = '';

    render(<CheckoutPageContent />);

    expect(await screen.findByText('No hay productos para confirmar')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Ver mis carritos' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Ir al menú' })).toBeInTheDocument();
  });
});