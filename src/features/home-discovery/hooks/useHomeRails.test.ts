import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { applyHomeFilters, sortRestaurants, useHomeRails } from './useHomeRails';
import { HomeFiltersState } from '../types';
import { RestaurantWithBranches } from '@/types';

const makeRestaurant = (overrides: Partial<RestaurantWithBranches>): RestaurantWithBranches => ({
  id: 'r-1',
  name: 'Restaurante',
  slug: 'restaurante',
  logo_url: null,
  description: null,
  is_active: true,
  rating: 4,
  review_count: 20,
  estimated_delivery_fee: 1000,
  promo_text: null,
  eta_min: 30,
  avg_price_estimate: 9000,
  branches: [],
  categories: [],
  ...overrides
});

const defaultFilters: HomeFiltersState = {
  price_band: null,
  eta_max: null,
  rating_min: null,
  delivery_fee_max: null,
  promotions_only: false
};

describe('useHomeRails filter and sort helpers', () => {
  const restaurants = [
    makeRestaurant({ id: 'budget-fast', avg_price_estimate: 7000, eta_min: 20, rating: 4.1, estimated_delivery_fee: 800, distance: 2.1 }),
    makeRestaurant({ id: 'mid-rated', avg_price_estimate: 12000, eta_min: 35, rating: 4.8, estimated_delivery_fee: 1200, distance: 4.8 }),
    makeRestaurant({ id: 'premium-promo', avg_price_estimate: 16500, eta_min: 42, rating: 4.5, estimated_delivery_fee: 900, promo_text: '2x1', distance: 6.2 })
  ];

  it('applies multiple filters as intersection', () => {
    const filtered = applyHomeFilters(restaurants, {
      ...defaultFilters,
      eta_max: 30,
      delivery_fee_max: 900,
      promotions_only: false
    });

    expect(filtered.map((item) => item.id)).toEqual(['budget-fast']);
  });

  it('filters by promotions_only and price_band', () => {
    const filtered = applyHomeFilters(restaurants, {
      ...defaultFilters,
      promotions_only: true,
      price_band: 'premium'
    });

    expect(filtered.map((item) => item.id)).toEqual(['premium-promo']);
  });

  it('sorts by fastest, top_rated, and closest', () => {
    const fastest = sortRestaurants(restaurants, 'fastest').map((item) => item.id);
    const topRated = sortRestaurants(restaurants, 'top_rated').map((item) => item.id);
    const closest = sortRestaurants(restaurants, 'closest').map((item) => item.id);

    expect(fastest).toEqual(['budget-fast', 'mid-rated', 'premium-promo']);
    expect(topRated).toEqual(['mid-rated', 'premium-promo', 'budget-fast']);
    expect(closest).toEqual(['budget-fast', 'mid-rated', 'premium-promo']);
  });

  it('always includes Promos, Mejor calidad and Cerca de ti sections first', () => {
    const { result } = renderHook(() =>
      useHomeRails({
        restaurants,
        activeIntent: null,
        filters: defaultFilters,
        sortBy: 'best_value',
        personalizedEnabled: false,
        isReturningSession: false,
        viewedHistory: [],
        preferenceHints: { categoryWeights: {} }
      })
    );

    const rails = result.current;

    expect(rails[0]?.railId).toBe('promos');
    expect(rails[1]?.railId).toBe('best-quality');
    expect(rails[2]?.railId).toBe('nearest');
  });
});
