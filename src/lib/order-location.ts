export interface LatLng {
  lat: number;
  lng: number;
}

export interface ResolveOrderLocationOpenContextInput {
  hasProfileLocation: boolean;
  profilePosition?: LatLng | null;
  orderPosition?: LatLng | null;
}

export interface ResolveOrderLocationOpenContextResult {
  initialPosition: LatLng;
  shouldRequestCurrentLocation: boolean;
}

export const DEFAULT_ORDER_MAP_CENTER: LatLng = { lat: 9.935, lng: -84.091 };

export function resolveOrderLocationOpenContext(
  input: ResolveOrderLocationOpenContextInput
): ResolveOrderLocationOpenContextResult {
  const initialPosition = input.profilePosition || input.orderPosition || DEFAULT_ORDER_MAP_CENTER;

  return {
    initialPosition,
    shouldRequestCurrentLocation: !input.hasProfileLocation,
  };
}
