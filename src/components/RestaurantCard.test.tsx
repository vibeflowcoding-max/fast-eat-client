import { fireEvent, render, screen } from '@testing-library/react';
import RestaurantCard from './RestaurantCard';
import { RestaurantWithBranches } from '@/types';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock
  })
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'es-CR',
  useTranslations: () => (key: string, values?: { name?: string }) => {
    const dictionary: Record<string, string> = {
      promo: 'PROMO',
      etaPending: 'ETA pending',
      approx: 'approx',
      pricePending: 'Estimated total pending',
      free: 'Free',
      noReviews: 'No reviews yet',
      trusted: 'TRUSTED',
      restaurantFallback: 'Restaurant'
    };

    if (key === 'viewMenuAria') {
      return `View menu ${values?.name ?? ''}`;
    }

    return dictionary[key] ?? key;
  }
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
      code: 'pizza-centro',
      estimated_delivery_fee: 800
    }
  ],
  categories: [{ id: 'cat-1', name: 'Pizza', description: null, icon: '🍕' }],
  distance: 2.4
};

describe('RestaurantCard', () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it('uses primary branch delivery fee in truck badge', () => {
    render(<RestaurantCard restaurant={baseRestaurant} />);

    expect(screen.getByText('PROMO')).toBeInTheDocument();
    expect(screen.getByText('₡800')).toBeInTheDocument();
  });

  it('falls back to restaurant delivery fee when branch fee is missing', () => {
    render(
      <RestaurantCard
        restaurant={{
          ...baseRestaurant,
          estimated_delivery_fee: 1700,
          branches: [{ ...baseRestaurant.branches[0], estimated_delivery_fee: null }]
        }}
      />
    );

    expect(screen.getByText('₡1,700')).toBeInTheDocument();
  });

  it('falls back to placeholder image when image fails to load', () => {
    render(<RestaurantCard restaurant={baseRestaurant} />);

    const image = screen.getByAltText('Imagen de Pizza House') as HTMLImageElement;
    fireEvent.error(image);

    expect(image.src).toContain('/placeholder-restaurant.svg');
    expect(image.dataset.fallbackApplied).toBe('true');
  });

  it('shows rating fallback when rating data is missing', () => {
    render(
      <RestaurantCard
        restaurant={{ ...baseRestaurant, rating: null, review_count: 0 }}
      />
    );

    expect(screen.getByText('No reviews yet')).toBeInTheDocument();
  });
});
