import { fireEvent, render, screen } from '@testing-library/react';
import NotificationsPage from './page';

const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

const storeState = {
  bidNotifications: [] as Array<any>,
  markBidNotificationRead: vi.fn(),
  setDeepLinkTarget: vi.fn(),
};

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/hooks/useAppRouter', () => ({
  useAppRouter: () => routerMock,
}));

vi.mock('@/components/BottomNav', () => ({
  default: () => <div>bottom-nav</div>,
}));

vi.mock('@/store', () => ({
  useCartStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

describe('NotificationsPage', () => {
  beforeEach(() => {
    routerMock.push.mockReset();
    routerMock.back.mockReset();
    storeState.markBidNotificationRead.mockReset();
    storeState.setDeepLinkTarget.mockReset();
    storeState.bidNotifications = [];
  });

  it('renders the empty state when notification history is empty', () => {
    render(<NotificationsPage />);

    expect(screen.getByText('emptyTitle')).toBeInTheDocument();
  });

  it('groups notifications and routes to orders when one is clicked', () => {
    storeState.bidNotifications = [
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
          expiresAt: '2099-01-01T10:00:00.000Z',
          createdAt: '2099-01-01T10:00:00.000Z',
        },
        receivedAt: '2099-01-01T10:00:00.000Z',
        read: false,
      },
    ];

    render(<NotificationsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'offerTitle' }));

    expect(storeState.markBidNotificationRead).toHaveBeenCalledWith('bid-1');
    expect(storeState.setDeepLinkTarget).toHaveBeenCalledWith({ orderId: 'order-1', bidId: 'bid-1' });
    expect(routerMock.push).toHaveBeenCalledWith('/orders');
  });
});