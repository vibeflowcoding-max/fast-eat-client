import { act, render, waitFor } from '@testing-library/react';
import GoogleMapsAddressPicker from './GoogleMapsAddressPicker';

const reverseGeocodeMock = vi.fn();

vi.mock('@googlemaps/js-api-loader', () => ({
  Loader: class {
    load = vi.fn().mockResolvedValue(undefined);
  }
}));

vi.mock('@/services/maps-api', () => ({
  mapsApi: {
    reverseGeocode: (...args: unknown[]) => reverseGeocodeMock(...args)
  }
}));

class MarkerMock {
  position: { lat: number; lng: number };
  listeners: Record<string, () => void> = {};

  constructor(initialPosition: { lat: number; lng: number }) {
    this.position = initialPosition;
  }

  setPosition = vi.fn((nextPosition: { lat: number; lng: number }) => {
    this.position = nextPosition;
  });

  getPosition = vi.fn(() => ({
    lat: () => this.position.lat,
    lng: () => this.position.lng,
  }));

  addListener = vi.fn((eventName: string, callback: () => void) => {
    this.listeners[eventName] = callback;
  });

  trigger(eventName: string) {
    this.listeners[eventName]?.();
  }
}

class MapMock {
  center: { lat: number; lng: number };
  listeners: Record<string, (event?: any) => void> = {};

  constructor(initialCenter: { lat: number; lng: number }) {
    this.center = initialCenter;
  }

  setCenter = vi.fn((nextCenter: { lat: number; lng: number }) => {
    this.center = nextCenter;
  });

  addListener = vi.fn((eventName: string, callback: (event?: any) => void) => {
    this.listeners[eventName] = callback;
  });
}

describe('GoogleMapsAddressPicker', () => {
  let latestMap: MapMock | null = null;
  let latestMarker: MarkerMock | null = null;
  let originalGeolocation: Geolocation | undefined;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID = 'test-map-id';
    originalGeolocation = navigator.geolocation;

    reverseGeocodeMock.mockReset().mockResolvedValue({
      formatted_address: 'Dragged location',
      place_id: 'place-dragged',
      location: { lat: 10, lng: 20 },
      components: {}
    });

    latestMap = null;
    latestMarker = null;

    (globalThis as any).google = {
      maps: {
        importLibrary: vi.fn().mockResolvedValue({}),
        Map: vi.fn().mockImplementation((_element: HTMLElement, options: { center: { lat: number; lng: number } }) => {
          latestMap = new MapMock(options.center);
          return latestMap;
        }),
        Marker: vi.fn().mockImplementation((options: { position: { lat: number; lng: number } }) => {
          latestMarker = new MarkerMock(options.position);
          return latestMarker;
        }),
        marker: {
          AdvancedMarkerElement: vi.fn().mockImplementation((options: { position: { lat: number; lng: number } }) => {
            latestMarker = new MarkerMock(options.position);
            return latestMarker;
          })
        }
      }
    };
  });

  afterEach(() => {
    delete (globalThis as any).google;
    if (originalGeolocation) {
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: originalGeolocation,
      });
    }
  });

  it('auto-centers to current geolocation by default when no initial address is provided', async () => {
    const onChange = vi.fn();

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success: PositionCallback) => {
          success({
            coords: {
              latitude: 40.7128,
              longitude: -74.006,
            },
          } as GeolocationPosition);
        }),
      },
    });

    render(
      <GoogleMapsAddressPicker
        onChange={onChange}
      />
    );

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        'https://www.google.com/maps/search/?api=1&query=40.7128,-74.006',
        { lat: 40.7128, lng: -74.006 }
      );
    });
  });

  it('keeps dragged marker position when parent rerenders with same initial position', async () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <GoogleMapsAddressPicker
        initialPosition={{ lat: 9.935, lng: -84.091 }}
        onChange={onChange}
      />
    );

    await waitFor(() => {
      expect(latestMap).not.toBeNull();
      expect(latestMarker).not.toBeNull();
    });

    onChange.mockClear();

    await act(async () => {
      latestMarker?.setPosition({ lat: 9.94, lng: -84.09 });
      latestMarker?.trigger('dragend');
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        'https://www.google.com/maps/search/?api=1&query=9.94,-84.09',
        { lat: 9.94, lng: -84.09 }
      );
    });

    onChange.mockClear();

    rerender(
      <GoogleMapsAddressPicker
        initialPosition={{ lat: 9.935, lng: -84.091 }}
        onChange={onChange}
      />
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(latestMarker?.position).toEqual({ lat: 9.94, lng: -84.09 });
    expect(onChange).not.toHaveBeenCalledWith(
      'https://www.google.com/maps/search/?api=1&query=9.935,-84.091',
      { lat: 9.935, lng: -84.091 }
    );
  });
});
