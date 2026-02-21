import { fireEvent, render, screen } from '@testing-library/react';
import RestaurantCard from './RestaurantCard';
import { RestaurantWithBranches } from '@/types';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock
  })
}));

const baseRestaurant: RestaurantWithBranches = {
  id: 'restaurant-1',
  name: 'Pizza House',
  slug: 'pizza-house',
  logo_url: null,
  description: null,
  is_active: true,
  rating: 4.6,
  review_count: 120,
  estimated_delivery_fee: 1500,
  promo_text: '2x1 hoy',
  eta_min: 25,
  avg_price_estimate: 8200,
  branches: [
    {
      id: 'branch-1',
      restaurant_id: 'restaurant-1',
      name: 'Sucursal Centro',
      address: null,
      phone: null,
      is_active: true,
      latitude: null,
      longitude: null,
      image_url: 'https://example.com/pizza.jpg',
      city: 'San José',
      country: 'CR',
      human_addres: 'Centro, San José',
      delivery_radius_km: null,
      is_accepting_orders: true,
      code: 'pizza-centro'
    }
  ],
  categories: [{ id: 'cat-1', name: 'Pizza', description: null, icon: '🍕' }],
  distance: 2.4
};

describe('RestaurantCard', () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it('renders promo badge when restaurant has promo', () => {
    render(<RestaurantCard restaurant={baseRestaurant} />);

    expect(screen.getByText('Promo activa')).toBeInTheDocument();
    expect(screen.getByText('ETA 25 min')).toBeInTheDocument();
  });

  it('renders non-promo badge when promo is absent', () => {
    render(
      <RestaurantCard
        restaurant={{ ...baseRestaurant, promo_text: null }}
      />
    );

    expect(screen.getByText('Sin promo')).toBeInTheDocument();
    expect(screen.queryByText('Promo activa')).not.toBeInTheDocument();
  });

  it('falls back to placeholder image when image fails to load', () => {
    render(<RestaurantCard restaurant={baseRestaurant} />);

    const image = screen.getByAltText('Imagen de Pizza House') as HTMLImageElement;
    fireEvent.error(image);

    expect(image.src).toContain('/placeholder-restaurant.svg');
    expect(image.dataset.fallbackApplied).toBe('true');
  });

  it('shows new-restaurant fallback when rating data is missing', () => {
    render(
      <RestaurantCard
        restaurant={{ ...baseRestaurant, rating: null, review_count: 0 }}
      />
    );

    expect(screen.queryByText('Error de datos de restaurante')).not.toBeInTheDocument();
    expect(screen.getByText(/Nuevo/)).toBeInTheDocument();
    expect(screen.getByText(/Sin reseñas aún/)).toBeInTheDocument();
  });
});
