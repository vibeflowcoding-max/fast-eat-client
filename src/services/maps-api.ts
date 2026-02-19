export interface MapsCoordinates {
  lat: number;
  lng: number;
}

export interface MapsGeocodeComponents {
  street_number?: string;
  route?: string;
  locality?: string;
  administrative_area_level_1?: string;
  country?: string;
  postal_code?: string;
}

export interface MapsGeocodeData {
  formatted_address: string;
  location: MapsCoordinates;
  place_id: string;
  components: MapsGeocodeComponents;
}

export interface MapsAutocompletePrediction {
  description: string;
  place_id: string;
  main_text: string;
  secondary_text: string;
}

export interface MapsAutocompleteData {
  predictions: MapsAutocompletePrediction[];
}

export interface MapsPlaceDetailsData {
  place_id: string;
  name: string;
  formatted_address: string;
  location: MapsCoordinates;
  types: string[];
  rating?: number;
}

export type MapsDirectionsMode = 'driving' | 'walking' | 'bicycling' | 'transit';

export interface MapsDirectionsData {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  start_address: string;
  end_address: string;
}

export interface MapsConfigData {
  mapId: string | null;
  features: {
    autocomplete: boolean;
    directions: boolean;
    reverseGeocode: boolean;
  };
}

interface ProxyApiSuccess<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

async function proxyGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/external?target=fast-eat&path=${encodeURIComponent(path)}`, {
    method: 'GET',
    signal,
  });

  const payload = (await response.json()) as ProxyApiSuccess<T> | T;

  if (!response.ok) {
    const message = (payload as ProxyApiSuccess<T>)?.message || (payload as ProxyApiSuccess<T>)?.error || 'Maps request failed';
    throw new Error(message);
  }

  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    const wrapped = payload as ProxyApiSuccess<T>;
    return (wrapped.data ?? (wrapped as unknown as T)) as T;
  }

  return payload as T;
}

async function proxyPost<T>(path: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const response = await fetch('/api/external', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target: 'fast-eat',
      body: {
        path,
        ...body,
      },
    }),
    signal,
  });

  const payload = (await response.json()) as ProxyApiSuccess<T> | T;

  if (!response.ok) {
    const message = (payload as ProxyApiSuccess<T>)?.message || (payload as ProxyApiSuccess<T>)?.error || 'Maps request failed';
    throw new Error(message);
  }

  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    const wrapped = payload as ProxyApiSuccess<T>;
    return (wrapped.data ?? (wrapped as unknown as T)) as T;
  }

  return payload as T;
}

export const mapsApi = {
  geocodeAddress(address: string, options?: { language?: string; region?: string; signal?: AbortSignal }) {
    return proxyPost<MapsGeocodeData>('/api/maps/v1/geocode', {
      address,
      language: options?.language,
      region: options?.region,
    }, options?.signal);
  },

  reverseGeocode(lat: number, lng: number, options?: { language?: string; signal?: AbortSignal }) {
    return proxyPost<MapsGeocodeData>('/api/maps/v1/reverse-geocode', {
      lat,
      lng,
      language: options?.language,
    }, options?.signal);
  },

  autocompletePlaces(
    input: string,
    options?: { lat?: number; lng?: number; radius?: number; language?: string; signal?: AbortSignal }
  ) {
    const params = new URLSearchParams({ input });

    if (typeof options?.lat === 'number' && typeof options?.lng === 'number') {
      params.set('lat', String(options.lat));
      params.set('lng', String(options.lng));
    }

    if (typeof options?.radius === 'number') {
      params.set('radius', String(options.radius));
    }

    if (options?.language) {
      params.set('language', options.language);
    }

    return proxyGet<MapsAutocompleteData>(`/api/maps/v1/places/autocomplete?${params.toString()}`, options?.signal);
  },

  getPlaceDetails(placeId: string, options?: { language?: string; signal?: AbortSignal }) {
    const params = new URLSearchParams();
    if (options?.language) {
      params.set('language', options.language);
    }

    const suffix = params.toString() ? `?${params.toString()}` : '';
    return proxyGet<MapsPlaceDetailsData>(`/api/maps/v1/places/${encodeURIComponent(placeId)}${suffix}`, options?.signal);
  },

  getDirections(
    origin: MapsCoordinates,
    destination: MapsCoordinates,
    mode: MapsDirectionsMode = 'driving',
    options?: { signal?: AbortSignal }
  ) {
    return proxyPost<MapsDirectionsData>('/api/maps/v1/directions', {
      origin,
      destination,
      mode,
    }, options?.signal);
  },

  getMapsConfig(options?: { signal?: AbortSignal }) {
    return proxyGet<MapsConfigData>('/api/maps/v1/config', options?.signal);
  },
};
