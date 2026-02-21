import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrderNotificationsTray from './OrderNotificationsTray';
import { useCartStore } from '@/store';

describe('OrderNotificationsTray', () => {
  beforeEach(() => {
    useCartStore.setState({
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

    await user.click(screen.getByRole('button', { name: /nueva oferta/i }));

    expect(onOpenTracking).toHaveBeenCalledTimes(1);

    const state = useCartStore.getState();
    expect(state.bidNotifications[0].read).toBe(true);
    expect(state.deepLinkTarget).toEqual({ orderId: 'order-1', bidId: 'bid-1' });
  });
});
