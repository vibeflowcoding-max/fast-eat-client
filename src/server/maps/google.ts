type GoogleStatusResponse = { status: string; error_message?: string };

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GoogleGeocodeResult = {
  formatted_address: string;
  place_id: string;
  geometry: { location: { lat: number; lng: number } };
  address_components: GoogleAddressComponent[];
};

interface GoogleGeocodeApiResponse extends GoogleStatusResponse {
  results: GoogleGeocodeResult[];
}

interface GooglePlacesAutocompleteApiResponse extends GoogleStatusResponse {
  predictions: Array<{
    description: string;
    place_id: string;
    structured_formatting?: {
      main_text?: string;
      secondary_text?: string;
    };
  }>;
}

interface GooglePlaceDetailsApiResponse extends GoogleStatusResponse {
  result?: {
    place_id: string;
    name: string;
    formatted_address: string;
    geometry?: { location?: { lat: number; lng: number } };
    types?: string[];
    rating?: number;
  };
}

interface GoogleDirectionsApiResponse extends GoogleStatusResponse {
  routes: Array<{
    legs: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      start_address: string;
      end_address: string;
    }>;
  }>;
}

const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';
const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.GOOGLE_MAPS_TIMEOUT_MS || '5000', 10);
const DEFAULT_RETRIES = Number.parseInt(process.env.GOOGLE_MAPS_MAX_RETRIES || '1', 10);

function getMapsApiKey(): string {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY
    || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    || '';

  if (!key) {
    throw new Error('Google Maps server API key is not configured');
  }

  return key;
}

async function requestJson<T>(url: string, retries = DEFAULT_RETRIES): Promise<T> {
  let attempt = 0;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status >= 500 && attempt < retries) {
          attempt += 1;
          continue;
        }

        throw new Error(`Maps upstream request failed with status ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeout);

      const isAbort = error instanceof Error && error.name === 'AbortError';
      if ((isAbort || error instanceof Error) && attempt < retries) {
        attempt += 1;
        continue;
      }

      if (isAbort) {
        throw new Error('Maps upstream request timed out');
      }

      throw error instanceof Error ? error : new Error('Maps upstream request failed');
    }
  }

  throw new Error('Unable to process maps request');
}

function normalizeStatus(status: string | undefined): string {
  return String(status || '').toUpperCase();
}

function assertGoogleSuccess(response: GoogleStatusResponse, fallback: string) {
  const status = normalizeStatus(response.status);
  if (status === 'OK' || status === 'ZERO_RESULTS') {
    return;
  }

  throw new Error(response.error_message || fallback);
}

function mapGeocodeComponents(components: GoogleAddressComponent[]) {
  const result: Record<string, string> = {};

  for (const component of components || []) {
    for (const type of component.types || []) {
      if (!result[type]) {
        result[type] = component.long_name;
      }
    }
  }

  return result;
}

export async function getMapsConfigPayload() {
  return {
    mapId: process.env.GOOGLE_MAPS_MAP_ID || process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || null,
    features: {
      autocomplete: Boolean(process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
      directions: Boolean(process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
      reverseGeocode: Boolean(process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
    },
  };
}

export async function geocodeAddressPayload(address: string, language?: string, region?: string) {
  const params = new URLSearchParams({
    address: address.trim(),
    key: getMapsApiKey(),
  });

  if (language) {
    params.append('language', language.trim());
  }
  if (region) {
    params.append('region', region.trim());
  }

  const response = await requestJson<GoogleGeocodeApiResponse>(`${GOOGLE_MAPS_BASE_URL}/geocode/json?${params.toString()}`);
  assertGoogleSuccess(response, 'Geocode request failed');

  const first = response.results?.[0];
  if (!first) {
    throw new Error('Address not found');
  }

  return {
    formatted_address: first.formatted_address,
    location: first.geometry.location,
    place_id: first.place_id,
    components: mapGeocodeComponents(first.address_components || []),
  };
}

export async function reverseGeocodePayload(lat: number, lng: number, language?: string) {
  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    key: getMapsApiKey(),
  });

  if (language) {
    params.append('language', language.trim());
  }

  const response = await requestJson<GoogleGeocodeApiResponse>(`${GOOGLE_MAPS_BASE_URL}/geocode/json?${params.toString()}`);
  assertGoogleSuccess(response, 'Reverse geocode request failed');

  const first = response.results?.[0];
  if (!first) {
    throw new Error('Location not found');
  }

  return {
    formatted_address: first.formatted_address,
    location: first.geometry.location,
    place_id: first.place_id,
    components: mapGeocodeComponents(first.address_components || []),
  };
}

export async function autocompletePlacesPayload(options: {
  input: string;
  lat?: number;
  lng?: number;
  radius?: number;
  language?: string;
}) {
  const params = new URLSearchParams({
    input: options.input.trim(),
    key: getMapsApiKey(),
  });

  if (options.language) {
    params.append('language', options.language.trim());
  }
  if (typeof options.lat === 'number' && typeof options.lng === 'number') {
    params.append('location', `${options.lat},${options.lng}`);
  }
  if (typeof options.radius === 'number') {
    params.append('radius', String(options.radius));
  }

  const response = await requestJson<GooglePlacesAutocompleteApiResponse>(`${GOOGLE_MAPS_BASE_URL}/place/autocomplete/json?${params.toString()}`);
  assertGoogleSuccess(response, 'Places autocomplete request failed');

  return {
    predictions: Array.isArray(response.predictions)
      ? response.predictions.map((prediction) => ({
          description: prediction.description,
          place_id: prediction.place_id,
          main_text: prediction.structured_formatting?.main_text || prediction.description,
          secondary_text: prediction.structured_formatting?.secondary_text || '',
        }))
      : [],
  };
}

export async function getPlaceDetailsPayload(placeId: string, language?: string) {
  const params = new URLSearchParams({
    place_id: placeId.trim(),
    key: getMapsApiKey(),
    fields: 'place_id,name,formatted_address,geometry,types,rating',
  });

  if (language) {
    params.append('language', language.trim());
  }

  const response = await requestJson<GooglePlaceDetailsApiResponse>(`${GOOGLE_MAPS_BASE_URL}/place/details/json?${params.toString()}`);
  assertGoogleSuccess(response, 'Place details request failed');

  if (!response.result?.geometry?.location) {
    throw new Error('Place details not found');
  }

  return {
    place_id: response.result.place_id,
    name: response.result.name,
    formatted_address: response.result.formatted_address,
    location: response.result.geometry.location,
    types: Array.isArray(response.result.types) ? response.result.types : [],
    rating: typeof response.result.rating === 'number' ? response.result.rating : undefined,
  };
}

export async function getDirectionsPayload(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: 'driving' | 'walking' | 'bicycling' | 'transit',
) {
  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    mode,
    key: getMapsApiKey(),
  });

  const response = await requestJson<GoogleDirectionsApiResponse>(`${GOOGLE_MAPS_BASE_URL}/directions/json?${params.toString()}`);
  assertGoogleSuccess(response, 'Directions request failed');

  const firstLeg = response.routes?.[0]?.legs?.[0];
  if (!firstLeg) {
    throw new Error('Directions not found');
  }

  return {
    distance: firstLeg.distance,
    duration: firstLeg.duration,
    start_address: firstLeg.start_address,
    end_address: firstLeg.end_address,
  };
}