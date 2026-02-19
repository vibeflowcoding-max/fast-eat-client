import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildPreferenceHints,
  clearViewedRestaurantsHistory,
  getViewedRestaurantsHistory,
  trackViewedRestaurant
} from './discoveryStorage';
import { RestaurantWithBranches } from '@/types';

const makeRestaurant = (id: string, categories: string[]): RestaurantWithBranches => ({
  id,
  name: `Restaurant ${id}`,
  slug: `restaurant-${id}`,
  logo_url: null,
  description: null,
  is_active: true,
  rating: 4.1,
  review_count: 20,
  estimated_delivery_fee: 1000,
  promo_text: null,
  eta_min: 28,
  avg_price_estimate: 8600,
  branches: [],
  categories: categories.map((name, index) => ({ id: `${id}-${index}`, name, description: null, icon: '' }))
});

describe('discoveryStorage personalized history', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it('stores viewed restaurants with dedupe and recency order', () => {
    trackViewedRestaurant(makeRestaurant('r1', ['Sushi']));
    trackViewedRestaurant(makeRestaurant('r2', ['Pizza']));
    trackViewedRestaurant(makeRestaurant('r1', ['Sushi']));

    const history = getViewedRestaurantsHistory();

    expect(history.map((entry) => entry.restaurantId)).toEqual(['r1', 'r2']);
  });

  it('builds preference hints from history entries', () => {
    const now = Date.now();
    const hints = buildPreferenceHints([
      { restaurantId: 'r1', viewedAt: now, categories: ['Sushi', 'Ramen'], etaMinutes: 20, finalPriceEstimate: 8000 },
      { restaurantId: 'r2', viewedAt: now - 1000, categories: ['Sushi'], etaMinutes: 30, finalPriceEstimate: 9000 }
    ]);

    expect(hints.categoryWeights.sushi).toBeGreaterThan(0);
    expect(hints.preferredEtaMax).toBe(25);
    expect(hints.preferredPriceMax).toBe(8500);
  });

  it('clears viewed history', () => {
    trackViewedRestaurant(makeRestaurant('r1', ['Sushi']));
    clearViewedRestaurantsHistory();

    expect(getViewedRestaurantsHistory()).toEqual([]);
  });
});
