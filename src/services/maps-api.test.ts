import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mapsApi } from './maps-api';

describe('mapsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls reverse geocode through external proxy', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            formatted_address: 'San José, Costa Rica',
            location: { lat: 9.93, lng: -84.09 },
            place_id: 'place-1',
            components: {},
          },
        }),
      })) as any,
    );

    const result = await mapsApi.reverseGeocode(9.93, -84.09);

    expect(fetch).toHaveBeenCalledWith(
      '/api/external',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.place_id).toBe('place-1');

    vi.unstubAllGlobals();
  });

  it('builds autocomplete query params correctly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          success: true,
          data: { predictions: [] },
        }),
      })) as any,
    );

    await mapsApi.autocompletePlaces('San', { lat: 9.93, lng: -84.09, radius: 5000 });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/external?target=fast-eat&path='),
      expect.objectContaining({ method: 'GET' }),
    );

    vi.unstubAllGlobals();
  });
});
