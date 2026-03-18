import { render, screen } from '@testing-library/react';
import OrderTrackingModal from './OrderTrackingModal';

const useOrderTrackingMock = vi.fn(() => ({ orders: [], isConnected: false }));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (key === 'statusMessages.preparing') {
      return `preparing:${values?.minutes ?? 0}`;
    }

    return key;
  },
}));

vi.mock('../hooks/useOrderTracking', () => ({
  useOrderTracking: (...args: unknown[]) => useOrderTrackingMock(...args),
}));

vi.mock('@/store', () => ({
  useCartStore: (selector?: (state: any) => unknown) => {
    const state = {
      bidsByOrderId: {},
      deepLinkTarget: null,
      setDeepLinkTarget: vi.fn(),
      setOrderBids: vi.fn(),
      updateActiveOrder: vi.fn(),
      clearCart: vi.fn(),
      auctionStateByOrderId: {},
    };

    return selector ? selector(state) : state;
  },
}));

vi.mock('@/services/api', () => ({
  acceptBid: vi.fn(),
  confirmDelivery: vi.fn(),
  counterOffer: vi.fn(),
  listOrderBids: vi.fn(),
}));

vi.mock('./BidRow', () => ({
  default: () => null,
}));

vi.mock('@/features/reviews/components/PhotoReviewModal', () => ({
  default: () => null,
}));

describe('OrderTrackingModal', () => {
  beforeEach(() => {
    useOrderTrackingMock.mockClear();
  });

  it('does not activate live tracking when the modal is closed', () => {
    render(
      <OrderTrackingModal
        isOpen={false}
        branchId="branch-1"
        phone="+50688888888"
        customerId="customer-1"
        onClose={vi.fn()}
      />,
    );

    expect(useOrderTrackingMock).toHaveBeenCalledWith('', '', undefined);
  });

  it('activates live tracking when the modal is open', () => {
    render(
      <OrderTrackingModal
        isOpen
        branchId="branch-1"
        phone="+50688888888"
        customerId="customer-1"
        onClose={vi.fn()}
      />,
    );

    expect(useOrderTrackingMock).toHaveBeenCalledWith('branch-1', '+50688888888', 'customer-1');
    expect(screen.getByText('title')).toBeInTheDocument();
  });
});