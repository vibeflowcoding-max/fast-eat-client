export function parseCoordsFromGoogleMapsUrl(url: string | null | undefined): { lat?: number; lng?: number } {
  const raw = String(url || '').trim();
  if (!raw) {
    return {};
  }

  const match = raw.match(/(?:q|query)=([-\d.]+),([-\d.]+)/i);
  if (!match) {
    return {};
  }

  const lat = Number(match[1]);
  const lng = Number(match[2]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {};
  }

  return { lat, lng };
}

export function extractGoogleMapsUrl(value: string | null | undefined): string | null {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  const match = raw.match(/https:\/\/www\.google\.com\/maps(?:\/search\/\?api=1&query=[^\s]+|\?q=[^\s]+)/i);
  return match?.[0] ?? null;
}

export function normalizeLocationReference(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

export function buildGoogleMapsQueryUrl(position: { lat: number; lng: number }): string {
  return `https://www.google.com/maps?q=${position.lat},${position.lng}`;
}

export function areLocationsEquivalent(input: {
  aUrl?: string | null;
  aLat?: number;
  aLng?: number;
  bUrl?: string | null;
  bLat?: number;
  bLng?: number;
  tolerance?: number;
}): boolean {
  const tolerance = typeof input.tolerance === 'number' ? Math.max(0, input.tolerance) : 0.0001;

  const aFromUrl = parseCoordsFromGoogleMapsUrl(input.aUrl);
  const bFromUrl = parseCoordsFromGoogleMapsUrl(input.bUrl);

  const aLat = Number.isFinite(input.aLat as number) ? Number(input.aLat) : aFromUrl.lat;
  const aLng = Number.isFinite(input.aLng as number) ? Number(input.aLng) : aFromUrl.lng;
  const bLat = Number.isFinite(input.bLat as number) ? Number(input.bLat) : bFromUrl.lat;
  const bLng = Number.isFinite(input.bLng as number) ? Number(input.bLng) : bFromUrl.lng;

  if (
    Number.isFinite(aLat as number) &&
    Number.isFinite(aLng as number) &&
    Number.isFinite(bLat as number) &&
    Number.isFinite(bLng as number)
  ) {
    return Math.abs((aLat as number) - (bLat as number)) <= tolerance && Math.abs((aLng as number) - (bLng as number)) <= tolerance;
  }

  const normalizedA = normalizeLocationReference(input.aUrl);
  const normalizedB = normalizeLocationReference(input.bUrl);

  if (!normalizedA || !normalizedB) {
    return false;
  }

  return normalizedA === normalizedB;
}
