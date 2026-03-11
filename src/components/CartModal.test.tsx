import { fireEvent, render, screen } from '@testing-library/react';
import CartModal from './CartModal';
import type { CartItem, OrderMetadata } from '@/types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/components/GoogleMapsAddressPicker', () => ({
  default: ({ readOnly, showUrlInput }: { readOnly?: boolean; showUrlInput?: boolean }) => (
    <div>
      <span>{readOnly ? 'inline-map-readonly' : 'inline-map-editable'}</span>
      {showUrlInput !== false ? <span>google-maps-url-field</span> : null}
      <button type="button">Permitir ubicación</button>
    </div>
  ),
}));

const baseOrderMetadata: OrderMetadata = {
  customerName: 'Test User',
  customerPhone: '88888888',
  paymentMethod: 'cash',
  orderType: 'delivery',
  source: 'client',
  address: 'San Jose, Costa Rica',
  gpsLocation: 'https://www.google.com/maps?q=9.9,-84.1',
  deliveryNotes: '',
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
  onOpenLocationPicker: vi.fn(),
  tableQuantity: 0,
};

describe('CartModal delivery validation', () => {
  it('renders the embedded preview map when using the saved profile location', () => {
    render(
      <CartModal
        {...baseProps}
        hasProfileLocation
        profileLocationLabel="Casa"
        orderMetadata={{
          ...baseOrderMetadata,
          customerLatitude: 9.93,
          customerLongitude: -84.08,
        }}
      />,
    );

    expect(screen.getByText('inline-map-readonly')).toBeInTheDocument();
  });

  it('renders subtotal and fee breakdown in checkout footer', () => {
    render(
      <CartModal
        {...baseProps}
        orderMetadata={baseOrderMetadata}
      />,
    );

    expect(screen.getByText('subtotal')).toBeInTheDocument();
    expect(screen.getByText('serviceFee')).toBeInTheDocument();
    expect(screen.getByText('platformFee')).toBeInTheDocument();
    expect(screen.getByText('total')).toBeInTheDocument();
    expect(screen.getByText('deliveryDisclaimer')).toBeInTheDocument();
  });

  it('renders the shared close button with an accessible label', () => {
    render(
      <CartModal
        {...baseProps}
        orderMetadata={baseOrderMetadata}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
  });

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

  it('renders the modal map as read-only and hides the raw URL field', () => {
    render(
      <CartModal
        {...baseProps}
        hasProfileLocation
        profileLocationLabel="Casa"
        orderMetadata={{
          ...baseOrderMetadata,
          locationOverriddenFromProfile: true,
        }}
      />,
    );

    expect(screen.getByText('inline-map-readonly')).toBeInTheDocument();
    expect(screen.queryByText('google-maps-url-field')).not.toBeInTheDocument();
    expect(screen.queryByText('differentLocationWarning')).not.toBeInTheDocument();
    expect(screen.queryByText('gpsRequired')).not.toBeInTheDocument();
    expect(screen.queryByText('currentOrderLocation')).not.toBeInTheDocument();
    expect(screen.getByText('deliveryAddressSummary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'openMapLocationPicker' })).toBeInTheDocument();
  });
});
