import { fireEvent, render, screen } from '@testing-library/react';
import OrderForm from './OrderForm';
import type { OrderMetadata } from '@/types';

const googleMapsPickerMock = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/components/GoogleMapsAddressPicker', () => ({
  default: (props: {
    readOnly?: boolean;
    showUrlInput?: boolean;
    onChange: (url: string, position: { lat: number; lng: number } | null, normalized?: { formatted_address?: string }) => void;
  }) => {
    googleMapsPickerMock(props);

    return (
      <div>
        <span>{props.readOnly ? 'inline-map-readonly' : 'inline-map-editable'}</span>
        {props.showUrlInput !== false ? <span>google-maps-url-field</span> : null}
        <button
          type="button"
          onClick={() => props.onChange('https://www.google.com/maps/search/?api=1&query=10,-84', { lat: 10, lng: -84 }, { formatted_address: 'New delivery point' })}
        >
          inline-map-picker
        </button>
        <button type="button">Permitir ubicación</button>
      </div>
    );
  },
}));

const baseMetadata: OrderMetadata = {
  customerName: 'Test User',
  customerPhone: '88888888',
  paymentMethod: 'cash',
  orderType: 'delivery',
  source: 'client',
  address: 'San Jose, Costa Rica',
  gpsLocation: 'https://www.google.com/maps?q=9.9,-84.1',
  deliveryNotes: '',
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
  onInlineLocationChange: vi.fn(),
  onOpenLocationPicker: vi.fn(),
  tableQuantity: 4,
};

describe('OrderForm', () => {
  beforeEach(() => {
    baseProps.setOrderMetadata = vi.fn();
    baseProps.onInlineLocationChange = vi.fn();
    baseProps.onOpenLocationPicker = vi.fn();
    googleMapsPickerMock.mockReset();
  });

  it('renders readonly customer information and an embedded map preview for the saved profile location', () => {
    render(
      <OrderForm
        {...baseProps}
        hasProfileLocation
        onUseDifferentLocation={vi.fn()}
        profileLocationLabel="https://www.google.com/maps?q=9.9,-84.1"
      />,
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('+50688888888')).toBeInTheDocument();
    expect(screen.getByText('inline-map-readonly')).toBeInTheDocument();
    expect(screen.getByText('San Jose, Costa Rica')).toBeInTheDocument();
    expect(screen.queryByText('deliveryLocationSource')).not.toBeInTheDocument();
    expect(screen.queryByText('locationMapPreviewHint')).not.toBeInTheDocument();
    expect(screen.queryByText('locationMapEditHint')).not.toBeInTheDocument();
    expect(screen.queryByText('gpsRequired')).not.toBeInTheDocument();
    expect(screen.queryByText('differentLocationWarning')).not.toBeInTheDocument();
    expect(screen.queryByText('useProfileLocation')).not.toBeInTheDocument();
    expect(screen.queryByText('currentOrderLocation')).not.toBeInTheDocument();
    expect(screen.getByText('deliveryAddressSummary')).toBeInTheDocument();
    expect(screen.queryByText('google-maps-url-field')).not.toBeInTheDocument();
    expect(screen.getByText('Permitir ubicación')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'openMapLocationPicker' })).toBeInTheDocument();
  });

  it('shows delivery notes in the location summary card when they exist', () => {
    render(
      <OrderForm
        {...baseProps}
        orderMetadata={{
          ...baseMetadata,
          deliveryNotes: 'Meet at door',
        }}
      />,
    );

    expect(screen.getByText('deliveryNotesSummary')).toBeInTheDocument();
    expect(screen.getByText('deliveryAddressSummary')).toBeInTheDocument();
    expect(screen.getByText('Meet at door')).toBeInTheDocument();
    expect(screen.getByText('San Jose, Costa Rica')).toBeInTheDocument();
    expect(screen.queryByText('currentOrderLocation')).not.toBeInTheDocument();
  });

  it('shows only the address when delivery notes are not present', () => {
    render(
      <OrderForm
        {...baseProps}
        orderMetadata={{
          ...baseMetadata,
          deliveryNotes: '',
        }}
      />,
    );

    expect(screen.queryByText('deliveryNotesSummary')).not.toBeInTheDocument();
    expect(screen.getByText('deliveryAddressSummary')).toBeInTheDocument();
    expect(screen.getByText('San Jose, Costa Rica')).toBeInTheDocument();
    expect(screen.queryByText('Meet at door')).not.toBeInTheDocument();
    expect(screen.queryByText('currentOrderLocation')).not.toBeInTheDocument();
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

    expect(screen.queryByText('differentLocationWarning')).not.toBeInTheDocument();
    expect(onToggleLocationDifferenceAcknowledged).not.toHaveBeenCalled();
  });

  it('renders a read-only embedded map and keeps the full picker entry point for different locations', () => {

    render(
      <OrderForm
        {...baseProps}
        hasProfileLocation
        isUsingDifferentDeliveryLocation
        profileLocationLabel="https://www.google.com/maps?q=9.9,-84.1"
      />,
    );

    expect(screen.getByText('inline-map-readonly')).toBeInTheDocument();
    expect(screen.queryByText('deliveryLocationSource')).not.toBeInTheDocument();
    expect(screen.queryByText('locationMapEditHint')).not.toBeInTheDocument();
    expect(screen.queryByText('google-maps-url-field')).not.toBeInTheDocument();
    expect(screen.queryByText('useProfileLocation')).not.toBeInTheDocument();
    expect(screen.queryByText('gpsRequired')).not.toBeInTheDocument();
    expect(screen.queryByText('differentLocationWarning')).not.toBeInTheDocument();
    expect(screen.queryByText('currentOrderLocation')).not.toBeInTheDocument();
    expect(screen.getByText('deliveryAddressSummary')).toBeInTheDocument();
    expect(screen.getByText('Permitir ubicación')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'openMapLocationPicker' })).toBeInTheDocument();
  });
});