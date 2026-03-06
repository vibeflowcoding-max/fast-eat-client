import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRestaurants } from './useRestaurants';

function createRestaurant(id: string, name: string) {
  return {
    id,
    name,
    slug: name.toLowerCase(),
    logo_url: null,
    description: null,
    is_active: true,
    rating: 4.5,
    review_count: 10,
    estimated_delivery_fee: 1000,
    promo_text: null,
    eta_min: 25,
    avg_price_estimate: 8500,
    branches: [],
    categories: [],
  };
}

describe('useRestaurants', () => {
  it('aborts stale list requests when dependencies change', async () => {
    const pending: Array<{
      signal?: AbortSignal;
      resolve: (value: unknown) => void;
      reject: (reason?: unknown) => void;
    }> = [];

    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined;

        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });

        pending.push({ signal, resolve, reject });
      });
    }) as typeof fetch);

    const { result, rerender } = renderHook(
      ({ categoryId }) => useRestaurants({ categoryId }),
      { initialProps: { categoryId: 'cat-1' } },
    );

    rerender({ categoryId: 'cat-2' });

    expect(pending[0]?.signal?.aborted).toBe(true);

    pending[1]?.resolve({
      ok: true,
      json: async () => [createRestaurant('restaurant-2', 'Sushi')],
    });

    await waitFor(() => {
      expect(result.current.restaurants[0]?.id).toBe('restaurant-2');
    });

    vi.unstubAllGlobals();
  });
});