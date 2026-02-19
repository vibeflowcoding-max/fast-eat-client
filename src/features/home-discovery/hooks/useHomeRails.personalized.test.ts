import { describe, expect, it } from 'vitest';
import { buildPersonalizedRails, dedupeRails } from './useHomeRails';
import { HomeRail, ViewedRestaurantSignal } from '../types';
import { RestaurantWithBranches } from '@/types';

const makeRestaurant = (id: string, categories: string[]): RestaurantWithBranches => ({
  id,
  name: `Restaurant ${id}`,
  slug: `restaurant-${id}`,
  logo_url: null,
  description: null,
  is_active: true,
  rating: 4.2,
  review_count: 20,
  estimated_delivery_fee: 1000,
  promo_text: null,
  eta_min: 30,
  avg_price_estimate: 9000,
  branches: [],
  categories: categories.map((name, index) => ({ id: `${id}-${index}`, name, description: null, icon: '' }))
});

describe('personalized rails builders', () => {
  it('returns no personalized rails when history is insufficient', () => {
    const restaurants = [makeRestaurant('r1', ['Sushi']), makeRestaurant('r2', ['Pizza'])];
    const history: ViewedRestaurantSignal[] = [
      { restaurantId: 'r1', viewedAt: Date.now(), categories: ['Sushi'], etaMinutes: 25, finalPriceEstimate: 8000 }
    ];

    const rails = buildPersonalizedRails(restaurants, history, { categoryWeights: { sushi: 2 } });
    expect(rails).toEqual([]);
  });

  it('dedupes cards across adjacent rails', () => {
    const rails: HomeRail[] = [
      {
        railId: 'recently-viewed',
        title: 'Vistos recientemente',
        items: [makeRestaurant('r1', ['Sushi']), makeRestaurant('r2', ['Pizza'])]
      },
      {
        railId: 'popular-now',
        title: 'Popular ahora',
        items: [makeRestaurant('r2', ['Pizza']), makeRestaurant('r3', ['Burger'])]
      }
    ];

    const deduped = dedupeRails(rails);

    expect(deduped[0].items.map((item) => item.id)).toEqual(['r1', 'r2']);
    expect(deduped[1].items.map((item) => item.id)).toEqual(['r3']);
  });
});
