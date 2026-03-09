import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MysteryBoxPage from './page';

const { push, fetchMysteryBoxOffers, acceptMysteryBoxOffer } = vi.hoisted(() => ({
  push: vi.fn(),
  fetchMysteryBoxOffers: vi.fn(),
  acceptMysteryBoxOffer: vi.fn(),
}));

const mockState = {
  isAuthenticated: true,
};

vi.mock('@/services/api', () => ({
  fetchMysteryBoxOffers,
  acceptMysteryBoxOffer,
}));

vi.mock('@/hooks/useAppRouter', () => ({
  useAppRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/store', () => ({
  useCartStore: () => mockState,
}));

vi.mock('@/components/BottomNav', () => ({
  default: () => <div>bottom-nav</div>,
}));

describe('MysteryBoxPage', () => {
  beforeEach(() => {
    push.mockReset();
    fetchMysteryBoxOffers.mockReset();
    acceptMysteryBoxOffer.mockReset();
    mockState.isAuthenticated = true;
  });

  it('shows the auth fallback without loading offers', () => {
    mockState.isAuthenticated = false;

    render(<MysteryBoxPage />);

    expect(screen.getByText('Necesitas iniciar sesión para ver ofertas sorpresa personalizadas.')).toBeInTheDocument();
    expect(fetchMysteryBoxOffers).not.toHaveBeenCalled();
  });

  it('loads offers and handles acceptance flow', async () => {
    const offersPayload = {
      customerId: 'customer-1',
      generatedAt: '2026-03-08T10:00:00.000Z',
      offers: [
        {
          id: 'offer-1',
          source: 'generated',
          canAccept: true,
          restaurant: { id: 'rest-1', name: 'Yokohama' },
          branch: { id: 'branch-1', name: 'Yokohama Escazu' },
          title: 'Caja veggie sorpresa',
          description: 'Selección de items disponibles con descuento.',
          price: 5500,
          originalValue: 7200,
          availableUntil: '2026-03-08T22:00:00.000Z',
          dietaryTags: ['Vegetariano'],
          excludedAllergens: ['mani'],
          itemsPreview: [
            { menu_item_name: 'Oniguiri veggie', quantity: 2 },
            { menu_item_name: 'Tacos primavera', quantity: 1 },
          ],
        },
      ],
    };

    fetchMysteryBoxOffers
      .mockResolvedValueOnce(offersPayload)
      .mockResolvedValueOnce(offersPayload)
      .mockResolvedValueOnce({
        customerId: 'customer-1',
        generatedAt: '2026-03-08T10:05:00.000Z',
        offers: [],
      });

    acceptMysteryBoxOffer.mockResolvedValue({ acceptedOrder: { id: 'order-77' } });

    render(<MysteryBoxPage />);

    await waitFor(() => {
      expect(fetchMysteryBoxOffers).toHaveBeenCalledWith({
        limit: 6,
        maxPrice: 8000,
        serviceMode: 'delivery',
      });
    });

    expect(await screen.findByText('Caja veggie sorpresa')).toBeInTheDocument();
    expect(screen.getByText('Vegetariano')).toBeInTheDocument();
    expect(screen.getByText('Sin mani')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pickup Combos pensados para recoger rápido en el local.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buscar ofertas' }));

    await waitFor(() => {
      expect(fetchMysteryBoxOffers).toHaveBeenLastCalledWith({
        limit: 6,
        maxPrice: 8000,
        serviceMode: 'pickup',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar oferta' }));

    await waitFor(() => {
      expect(acceptMysteryBoxOffer).toHaveBeenCalledWith('offer-1');
    });

    expect(await screen.findByText('Oferta aceptada correctamente.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver orden creada' }));
    expect(push).toHaveBeenCalledWith('/orders/order-77');
  });
});