import { render, screen } from '@testing-library/react';
import CartModal from './CartModal';
import type { CartItem, OrderMetadata } from '@/types';

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
  it('disables confirm button for delivery orders without GPS coordinates', () => {
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

    expect(screen.getByRole('button', { name: /confirmar pedido/i })).toBeDisabled();
  });

  it('enables confirm button when delivery order has address and GPS coordinates', () => {
    render(
      <CartModal
        {...baseProps}
        orderMetadata={{
          ...baseOrderMetadata,
          customerLatitude: 9.9333,
          customerLongitude: -84.0833,
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /confirmar pedido/i })).toBeEnabled();
  });
});
