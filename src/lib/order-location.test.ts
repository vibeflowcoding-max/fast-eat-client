import { describe, expect, it } from 'vitest';
import { DEFAULT_ORDER_MAP_CENTER, resolveOrderLocationOpenContext } from './order-location';

describe('resolveOrderLocationOpenContext', () => {
  it('uses profile location and does not request geolocation when profile location exists', () => {
    const result = resolveOrderLocationOpenContext({
      hasProfileLocation: true,
      profilePosition: { lat: 10.01, lng: -84.12 },
      orderPosition: { lat: 9.99, lng: -84.02 },
    });

    expect(result.initialPosition).toEqual({ lat: 10.01, lng: -84.12 });
    expect(result.shouldRequestCurrentLocation).toBe(false);
  });

  it('requests geolocation and uses current order coordinates when profile location is missing', () => {
    const result = resolveOrderLocationOpenContext({
      hasProfileLocation: false,
      profilePosition: null,
      orderPosition: { lat: 10.2, lng: -84.3 },
    });

    expect(result.initialPosition).toEqual({ lat: 10.2, lng: -84.3 });
    expect(result.shouldRequestCurrentLocation).toBe(true);
  });

  it('falls back to default center when profile and order positions are missing', () => {
    const result = resolveOrderLocationOpenContext({
      hasProfileLocation: false,
      profilePosition: null,
      orderPosition: null,
    });

    expect(result.initialPosition).toEqual(DEFAULT_ORDER_MAP_CENTER);
    expect(result.shouldRequestCurrentLocation).toBe(true);
  });
});
