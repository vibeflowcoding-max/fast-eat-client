"use client";

import React from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { mapsApi, type MapsGeocodeData } from '@/services/maps-api';

declare const google: any;

interface LatLng {
  lat: number;
  lng: number;
}

function samePosition(a: LatLng | null | undefined, b: LatLng | null | undefined): boolean {
  if (!a || !b) {
    return false;
  }

  return Math.abs(a.lat - b.lat) < 0.000001 && Math.abs(a.lng - b.lng) < 0.000001;
}

interface GoogleMapsAddressPickerProps {
  initialUrl?: string;
  initialPosition?: LatLng | null;
  onChange: (urlAddress: string, position: LatLng | null, normalizedAddress?: MapsGeocodeData) => void;
  onPermissionDenied?: () => void;
  onPermissionGranted?: () => void;
  onPermissionRequested?: () => void;
}

const DEFAULT_CENTER: LatLng = { lat: 9.935, lng: -84.091 };

let mapsLoaderInitialized = false;
let mapsLoaderPromise: Promise<void> | null = null;

function buildMapsQueryUrl(position: LatLng): string {
  return `https://www.google.com/maps/search/?api=1&query=${position.lat},${position.lng}`;
}

function parseLatLngFromUrl(url: string): LatLng | null {
  const match = url.match(/(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!match) {
    return null;
  }

  const lat = Number.parseFloat(match[1]);
  const lng = Number.parseFloat(match[2]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function toLatLngLiteral(value: any): LatLng | null {
  if (!value) {
    return null;
  }

  if (typeof value.lat === 'function' && typeof value.lng === 'function') {
    return {
      lat: value.lat(),
      lng: value.lng()
    };
  }

  if (typeof value.lat === 'number' && typeof value.lng === 'number') {
    return {
      lat: value.lat,
      lng: value.lng
    };
  }

  return null;
}

export default function GoogleMapsAddressPicker({
  initialUrl,
  initialPosition,
  onChange,
  onPermissionDenied,
  onPermissionGranted,
  onPermissionRequested
}: GoogleMapsAddressPickerProps) {
  const mapRef = React.useRef<any>(null);
  const markerRef = React.useRef<any>(null);
  const mapDivRef = React.useRef<HTMLDivElement | null>(null);

  const [position, setPosition] = React.useState<LatLng | null>(initialPosition ?? parseLatLngFromUrl(initialUrl || ''));
  const [urlAddress, setUrlAddress] = React.useState(initialUrl ?? '');
  const [mapLoading, setMapLoading] = React.useState(true);
  const [mapError, setMapError] = React.useState<string | null>(null);
  const [isLocating, setIsLocating] = React.useState(false);
  const [locationError, setLocationError] = React.useState<string | null>(null);
  const [reverseGeocodeError, setReverseGeocodeError] = React.useState<string | null>(null);
  const reverseGeocodeControllerRef = React.useRef<AbortController | null>(null);
  const lastReverseGeocodeKeyRef = React.useRef<string | null>(null);
  const onPermissionRequestedRef = React.useRef(onPermissionRequested);
  const onPermissionGrantedRef = React.useRef(onPermissionGranted);
  const onPermissionDeniedRef = React.useRef(onPermissionDenied);
  const lastAppliedInitialPositionRef = React.useRef<LatLng | null>(null);
  const lastAppliedInitialUrlRef = React.useRef<string | undefined>(undefined);

  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

  React.useEffect(() => {
    onPermissionRequestedRef.current = onPermissionRequested;
    onPermissionGrantedRef.current = onPermissionGranted;
    onPermissionDeniedRef.current = onPermissionDenied;
  }, [onPermissionDenied, onPermissionGranted, onPermissionRequested]);

  React.useEffect(() => {
    return () => {
      reverseGeocodeControllerRef.current?.abort();
    };
  }, []);

  const emitPositionChange = React.useCallback((nextPosition: LatLng) => {
    if (samePosition(position, nextPosition)) {
      return;
    }

    const mapsUrl = buildMapsQueryUrl(nextPosition);
    setPosition(nextPosition);
    setUrlAddress(mapsUrl);
    onChange(mapsUrl, nextPosition);

    const reverseKey = `${nextPosition.lat.toFixed(6)},${nextPosition.lng.toFixed(6)}`;
    if (lastReverseGeocodeKeyRef.current === reverseKey) {
      return;
    }
    lastReverseGeocodeKeyRef.current = reverseKey;

    reverseGeocodeControllerRef.current?.abort();
    const controller = new AbortController();
    reverseGeocodeControllerRef.current = controller;

    mapsApi
      .reverseGeocode(nextPosition.lat, nextPosition.lng, { signal: controller.signal })
      .then((normalized) => {
        setReverseGeocodeError(null);
        onChange(mapsUrl, nextPosition, normalized);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        lastReverseGeocodeKeyRef.current = null;

        setReverseGeocodeError('Could not normalize the address from coordinates. Manual URL still works.');
      });
  }, [onChange, position]);

  const moveMapToPosition = React.useCallback((nextPosition: LatLng, shouldEmit = false) => {
    const map = mapRef.current;
    const marker = markerRef.current;

    if (map) {
      map.setCenter(nextPosition);
    }

    if (marker) {
      if (typeof marker.setPosition === 'function') {
        marker.setPosition(nextPosition);
      } else if ('position' in marker) {
        marker.position = nextPosition;
      }
    }

    if (shouldEmit) {
      emitPositionChange(nextPosition);
    } else {
      setPosition(nextPosition);
    }
  }, [emitPositionChange]);

  React.useEffect(() => {
    const didInitialPositionChange = !samePosition(lastAppliedInitialPositionRef.current, initialPosition ?? null);

    if (initialPosition) {
      if (didInitialPositionChange) {
        moveMapToPosition(initialPosition, true);
        lastAppliedInitialPositionRef.current = initialPosition;
      }
      lastAppliedInitialUrlRef.current = initialUrl;
      return;
    }

    const didInitialUrlChange = lastAppliedInitialUrlRef.current !== initialUrl;
    if (initialUrl && didInitialUrlChange) {
      setUrlAddress(initialUrl);

      const parsed = parseLatLngFromUrl(initialUrl);
      if (parsed) {
        moveMapToPosition(parsed);
        onChange(initialUrl, parsed);
      }
    }

    lastAppliedInitialPositionRef.current = null;
    lastAppliedInitialUrlRef.current = initialUrl;
  }, [initialPosition, initialUrl, moveMapToPosition, onChange]);

  React.useEffect(() => {
    let cancelled = false;

    const initializeMap = async () => {
      if (typeof window === 'undefined') {
        return;
      }

      if (!mapDivRef.current) {
        return;
      }

      if (mapRef.current) {
        setMapLoading(false);
        return;
      }

      try {
        setMapLoading(true);
        setMapError(null);

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          setMapError('Google Maps API key missing. You can still paste an URL manually.');
          setMapLoading(false);
          return;
        }

        const initializeLoader = async () => {
          if (mapsLoaderInitialized) {
            return;
          }

          const loader = new Loader({ apiKey, version: 'weekly' });
          await loader.load();
          if (typeof google?.maps?.importLibrary === 'function') {
            await google.maps.importLibrary('marker');
          }
          mapsLoaderInitialized = true;
        };

        if (!mapsLoaderPromise) {
          mapsLoaderPromise = initializeLoader();
        }

        await mapsLoaderPromise;

        if (cancelled || !mapDivRef.current) {
          return;
        }

        const parsedInitialUrlPosition = parseLatLngFromUrl(initialUrl || '');
        const hasExplicitInitialSelection = Boolean(initialPosition || parsedInitialUrlPosition);
        const basePosition = initialPosition || parsedInitialUrlPosition || position || DEFAULT_CENTER;

        if (cancelled) {
          return;
        }

        const map = new google.maps.Map(mapDivRef.current, {
          center: basePosition,
          zoom: 16,
          gestureHandling: 'greedy',
          draggable: true,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          ...(mapId ? { mapId } : {})
        });

        const AdvancedMarkerElement = google?.maps?.marker?.AdvancedMarkerElement;
        const marker = AdvancedMarkerElement
          ? new AdvancedMarkerElement({
            position: basePosition,
            map,
            gmpDraggable: true
          })
          : new google.maps.Marker({
            position: basePosition,
            map,
            draggable: true
          });

        mapRef.current = map;
        markerRef.current = marker;

        map.addListener('click', (event: any) => {
          if (!event?.latLng) {
            return;
          }

          const next = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          };

          if (typeof marker.setPosition === 'function') {
            marker.setPosition(next);
          } else {
            marker.position = next;
          }
          emitPositionChange(next);
        });

        marker.addListener('dragend', (event: any) => {
          const markerPosition =
            toLatLngLiteral(event?.latLng)
            || (typeof marker.getPosition === 'function' ? toLatLngLiteral(marker.getPosition()) : null)
            || toLatLngLiteral(marker.position);

          if (!markerPosition) {
            return;
          }

          emitPositionChange(markerPosition);
        });

        emitPositionChange(basePosition);

        if (!hasExplicitInitialSelection && navigator.geolocation) {
          onPermissionRequestedRef.current?.();

          navigator.geolocation.getCurrentPosition(
            (geoPosition) => {
              if (cancelled) {
                return;
              }

              onPermissionGrantedRef.current?.();
              const livePosition = {
                lat: geoPosition.coords.latitude,
                lng: geoPosition.coords.longitude
              };
              moveMapToPosition(livePosition, true);
            },
            () => {
              if (cancelled) {
                return;
              }

              onPermissionDeniedRef.current?.();
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        }

        setMapLoading(false);
      } catch (error) {
        mapsLoaderPromise = null;
        mapsLoaderInitialized = false;
        if (!cancelled) {
          setMapError('Could not load interactive map. You can still paste URL manually.');
          setMapLoading(false);
        }
      }
    };

    initializeMap();

    return () => {
      cancelled = true;
    };
  }, [emitPositionChange, initialPosition, initialUrl, mapId, moveMapToPosition, position]);

  const handleUseMyLocation = React.useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not available in this browser.');
      return;
    }

    onPermissionRequested?.();
    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (geoPosition) => {
        const nextPosition = {
          lat: geoPosition.coords.latitude,
          lng: geoPosition.coords.longitude
        };

        moveMapToPosition(nextPosition, true);
        onPermissionGranted?.();
        setIsLocating(false);
      },
      () => {
        setLocationError('Permission denied. You can still paste a Google Maps URL manually.');
        onPermissionDenied?.();
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [moveMapToPosition, onPermissionDenied, onPermissionGranted, onPermissionRequested]);

  const handleUrlChange = React.useCallback((value: string) => {
    setUrlAddress(value);
    const parsedPosition = parseLatLngFromUrl(value);
    if (parsedPosition) {
      moveMapToPosition(parsedPosition);
    }
    onChange(value, parsedPosition);
  }, [moveMapToPosition, onChange]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-gray-200" aria-label="Address map preview">
        <div
          ref={mapDivRef}
          className="h-56 w-full"
          aria-label="Interactive map picker"
          role="region"
        />
        {(mapLoading || isLocating) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50/85 text-sm text-gray-500">
            {isLocating ? 'Requesting location...' : 'Loading map...'}
          </div>
        )}
      </div>

      {mapError && (
        <p className="text-xs text-amber-700" aria-live="polite">
          {mapError}
        </p>
      )}

      <button
        type="button"
        onClick={handleUseMyLocation}
        disabled={isLocating}
        className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
      >
        {isLocating ? 'Requesting location...' : 'Permitir ubicación'}
      </button>

      <div>
        <label htmlFor="address-map-url" className="mb-1 block text-xs text-gray-600">
          Google Maps URL
        </label>
        <input
          id="address-map-url"
          type="url"
          value={urlAddress}
          onChange={(event) => handleUrlChange(event.target.value)}
          placeholder="https://www.google.com/maps/search/?api=1&query=..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {locationError && (
        <p className="text-xs text-amber-700" aria-live="polite">
          {locationError}
        </p>
      )}

      {reverseGeocodeError && (
        <p className="text-xs text-amber-700" aria-live="polite">
          {reverseGeocodeError}
        </p>
      )}
    </div>
  );
}
