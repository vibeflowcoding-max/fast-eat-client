import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrderNotificationsTray from './OrderNotificationsTray';
import { useCartStore } from '@/store';

const pushMock = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) => {
    if (key === 'offerTitle') {
      return 'Oferta de entrega recibida';
    }

    if (key === 'offerBody') {
      return `Tienes una oferta de entrega por ₡${values?.amount} para la orden ${values?.orderId}.`;
    }

    if (key === 'time.now') {
      return 'Ahora';
    }

    return key;
  },
}));

vi.mock('@/hooks/useAppRouter', () => ({
  useAppRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

describe('OrderNotificationsTray', () => {
  beforeEach(() => {
    pushMock.mockReset();
    useCartStore.setState({
      activeOrders: {
        'order-1': {
          orderId: 'order-1',
          orderNumber: 'ORDER_120',
          previousStatus: { code: 'PENDING', label: 'Pending' },
          newStatus: { code: 'AUCTION_ACTIVE', label: 'Auction active' },
          updatedAt: '2026-01-01T10:00:00.000Z',
        },
      },
      bidNotifications: [
        {
          id: 'bid-1',
          orderId: 'order-1',
          bid: {
            id: 'bid-1',
            bidAmount: 2900,
            driverRating: 4.8,
            estimatedTimeMinutes: 18,
            driverNotes: 'Fast delivery',
            basePrice: 2600,
            status: 'ACTIVE',
            expiresAt: '2026-01-01T10:00:00.000Z',
            createdAt: '2026-01-01T10:00:00.000Z'
          },
          receivedAt: '2026-01-01T10:00:00.000Z',
          read: false
        }
      ],
      deepLinkTarget: null
    });
  });

  it('marks notification as read and sets deep link on click', async () => {
    const user = userEvent.setup();
    const onOpenTracking = vi.fn();

    render(<OrderNotificationsTray onOpenTracking={onOpenTracking} />);

    await user.click(screen.getByRole('button', { name: 'Oferta de entrega recibida' }));

    expect(onOpenTracking).toHaveBeenCalledTimes(1);

    const state = useCartStore.getState();
    expect(state.bidNotifications[0].read).toBe(true);
    expect(state.deepLinkTarget).toEqual({ orderId: 'order-1', bidId: 'bid-1' });
  });

  it('renders the order number instead of the raw order id', () => {
    render(<OrderNotificationsTray onOpenTracking={vi.fn()} />);

    expect(screen.getByText(/ORDER_120/)).toBeInTheDocument();
    expect(screen.queryByText(/para la orden order-1\./i)).not.toBeInTheDocument();
  });

  it('opens the full notifications page from the tray footer', async () => {
    const user = userEvent.setup();

    render(<OrderNotificationsTray onOpenTracking={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'seeAll' }));

    expect(pushMock).toHaveBeenCalledWith('/notifications');
  });

  it('renders the empty state when no notifications exist', () => {
    useCartStore.setState({ bidNotifications: [], deepLinkTarget: null });

    render(<OrderNotificationsTray onOpenTracking={vi.fn()} />);

    expect(screen.getByText('emptyTitle')).toBeInTheDocument();
  });
});
