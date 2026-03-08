import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddressDetailsModal from './AddressDetailsModal';

vi.mock('@/components/GoogleMapsAddressPicker', () => ({
  default: () => <div data-testid="maps-picker" />
}));

describe('AddressDetailsModal', () => {
  it('saves with generated Google Maps URL when coordinates are selected and URL text is empty', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <AddressDetailsModal
        isOpen
        initialPosition={{ lat: 10.011177208953205, lng: -84.1 }}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Save address' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        urlAddress: 'https://www.google.com/maps/search/?api=1&query=10.011177208953205,-84.1',
        lat: 10.011177208953205,
        lng: -84.1,
      })
    );

    expect(screen.queryByText('Please provide a Google Maps URL before saving.')).not.toBeInTheDocument();
  });

  it('keeps selected building type during parent re-renders while modal is open', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <AddressDetailsModal
        isOpen
        initialValue={{
          urlAddress: 'https://www.google.com/maps/search/?api=1&query=10.011,-84.1',
          buildingType: 'Other',
          deliveryNotes: 'Meet at door',
        }}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    const hotelChoice = screen.getByRole('button', { name: 'Hotel' });

    await userEvent.click(hotelChoice);

    rerender(
      <AddressDetailsModal
        isOpen
        initialValue={{
          urlAddress: 'https://www.google.com/maps/search/?api=1&query=10.011,-84.1',
          buildingType: 'Other',
          deliveryNotes: 'Meet at door',
        }}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    expect(screen.getByRole('button', { name: /Hotel/ })).toHaveClass('border-orange-500');
  });

  it('labels the header close action and omits the back action when unavailable', () => {
    render(
      <AddressDetailsModal
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });
});