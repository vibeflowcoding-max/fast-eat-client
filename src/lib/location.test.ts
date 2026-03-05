import { describe, expect, it } from 'vitest';
import { areLocationsEquivalent, extractGoogleMapsUrl, parseCoordsFromGoogleMapsUrl } from './location';

describe('location helpers', () => {
  it('parses coords from google maps query url', () => {
    expect(parseCoordsFromGoogleMapsUrl('https://www.google.com/maps?q=10.011,-84.1006')).toEqual({
      lat: 10.011,
      lng: -84.1006,
    });
  });

  it('treats same coordinates as equivalent locations', () => {
    const same = areLocationsEquivalent({
      aUrl: 'https://www.google.com/maps?q=10.0110326,-84.1006691',
      bUrl: 'https://www.google.com/maps/search/?api=1&query=10.011032603,-84.100669139',
    });

    expect(same).toBe(true);
  });

  it('detects different coordinates as non-equivalent', () => {
    const different = areLocationsEquivalent({
      aUrl: 'https://www.google.com/maps?q=10.0110326,-84.1006691',
      bUrl: 'https://www.google.com/maps?q=9.935,-84.091',
    });

    expect(different).toBe(false);
  });

  it('extracts canonical google maps url from mixed text', () => {
    const extracted = extractGoogleMapsUrl(
      '📍 Ubicación GPS (Link): https://www.google.com/maps?q=10.011,-84.1006 extra text',
    );

    expect(extracted).toBe('https://www.google.com/maps?q=10.011,-84.1006');
  });
});
