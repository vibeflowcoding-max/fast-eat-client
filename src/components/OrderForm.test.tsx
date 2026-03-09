import { fireEvent, render, screen } from '@testing-library/react';
import OrderForm from './OrderForm';
import type { OrderMetadata } from '@/types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const baseMetadata: OrderMetadata = {
  customerName: 'Test User',
  customerPhone: '88888888',
  paymentMethod: 'cash',
  orderType: 'delivery',
  source: 'client',
  address: 'San Jose, Costa Rica',
  gpsLocation: 'https://www.google.com/maps?q=9.9,-84.1',
  locationOverriddenFromProfile: false,
  locationDifferenceAcknowledged: false,
};

const baseProps = {
  orderMetadata: baseMetadata,
  setOrderMetadata: vi.fn(),
  paymentOptions: [{ id: 'cash', label: 'Cash' }],
  serviceOptions: [{ id: 'delivery', label: 'Delivery' }, { id: 'dine_in', label: 'Dine in' }],
  fromNumber: '50688888888',
  isLocating: false,
  onGetLocation: vi.fn(),
  tableQuantity: 4,
};

describe('OrderForm', () => {
  beforeEach(() => {
    baseProps.setOrderMetadata = vi.fn();
  });

  it('renders readonly customer information and current delivery location', () => {
    render(<OrderForm {...baseProps} />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('+50688888888')).toBeInTheDocument();
    expect(screen.getByText('https://www.google.com/maps?q=9.9,-84.1')).toBeInTheDocument();
  });

  it('shows and toggles the different-location warning acknowledgement', () => {
    const onToggleLocationDifferenceAcknowledged = vi.fn();

    render(
      <OrderForm
        {...baseProps}
        orderMetadata={{
          ...baseMetadata,
          locationOverriddenFromProfile: true,
          locationDifferenceAcknowledged: false,
        }}
        hasProfileLocation
        isUsingDifferentDeliveryLocation
        locationDifferenceWarningVisible
        onToggleLocationDifferenceAcknowledged={onToggleLocationDifferenceAcknowledged}
        profileLocationLabel="Profile location"
      />,
    );

    const warningLabel = screen.getByText('differentLocationWarning').closest('label');
    const warningCheckbox = warningLabel?.querySelector('input[type="checkbox"]');

    expect(warningCheckbox).not.toBeNull();
    fireEvent.click(warningCheckbox as HTMLInputElement);

    expect(onToggleLocationDifferenceAcknowledged).toHaveBeenCalledWith(true);
  });
});