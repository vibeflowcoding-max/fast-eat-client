import { render, screen } from '@testing-library/react';
import CartModal from './CartModal';
import type { CartItem, OrderMetadata } from '@/types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const baseOrderMetadata: OrderMetadata = {
  customerName: 'Test User',
  customerPhone: '88888888',
  paymentMethod: 'cash',
  orderType: 'delivery',
  source: 'client',
  address: 'San Jose, Costa Rica',
  gpsLocation: 'https://www.google.com/maps?q=9.9,-84.1',
};

const cart: CartItem[] = [
  {
    id: 'item-1',
    name: 'Ramen',
    description: 'Hot ramen',
    image: 'https://example.com/ramen.jpg',
    price: 5000,
    category: 'Soups',
    quantity: 1,
    notes: '',
  },
];

const baseProps = {
  cart,
  setOrderMetadata: vi.fn(),
  onClose: vi.fn(),
  onPlaceOrder: vi.fn(),
  onSyncCartAction: vi.fn(),
  onGetLocation: vi.fn(),
  isSyncing: false,
  isOrdering: false,
  isLocating: false,
  paymentOptions: [{ id: 'cash', label: 'Cash' }],
  serviceOptions: [{ id: 'delivery', label: 'Delivery' }],
  fromNumber: '50688888888',
  tableQuantity: 0,
};

describe('CartModal delivery validation', () => {
  it('enables confirm button for delivery orders with address even without GPS coordinates', () => {
    render(
      <CartModal
        {...baseProps}
        orderMetadata={{
          ...baseOrderMetadata,
          customerLatitude: undefined,
          customerLongitude: undefined,
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /confirmOrder/i })).toBeEnabled();
  });

  it('enables confirm button when customer phone comes from fromNumber fallback', () => {
    render(
      <CartModal
        {...baseProps}
        orderMetadata={{
          ...baseOrderMetadata,
          customerPhone: '',
          customerLatitude: undefined,
          customerLongitude: undefined,
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /confirmOrder/i })).toBeEnabled();
  });
});
