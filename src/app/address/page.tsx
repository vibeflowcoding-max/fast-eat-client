'use client';

import React from 'react';
import { ArrowLeft, Crosshair, Loader2, MapPin } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import BottomNav from '@/components/BottomNav';
import AddressDetailsForm from '@/components/AddressDetailsForm';
import type { AddressFormValue } from '@/components/AddressDetailsModal';
import { useAppRouter } from '@/hooks/useAppRouter';
import { getAccessToken, getAuthenticatedJsonHeaders } from '@/lib/client-auth';
import { parseCoordsFromGoogleMapsUrl } from '@/lib/location';
import { normalizePhoneWithSinglePlus } from '@/lib/phone';
import { AppShell, Button, SectionHeader, StickyHeaderBar, Surface } from '@/../resources/components';
import { emitHomeEvent } from '@/features/home-discovery/analytics';
import { useCartStore } from '@/store';

type StoredAddress = {
  customerId?: string;
  urlAddress: string;
  buildingType: 'Apartment' | 'Residential Building' | 'Hotel' | 'Office Building' | 'Other';
  unitDetails?: string;
  deliveryNotes: string;
  lat?: number;
  lng?: number;
  formattedAddress?: string;
  placeId?: string;
} | null;

function resolveNextPath(rawValue: string | null): string {
  if (!rawValue) {
    return '/profile';
  }

  return rawValue.startsWith('/') ? rawValue : '/profile';
}

function appendSuccessFlag(path: string): string {
  const [pathname, hashFragment] = path.split('#');
  const separator = pathname.includes('?') ? '&' : '?';
  const nextPath = `${pathname}${separator}addressSaved=1`;

  return hashFragment ? `${nextPath}#${hashFragment}` : nextPath;
}

function normalizeStoredAddress(payload: any): StoredAddress {
  if (!payload || typeof payload !== 'object' || typeof payload.url_address !== 'string') {
    return null;
  }

  return {
    customerId: typeof payload.customer_id === 'string' ? payload.customer_id : undefined,
    urlAddress: payload.url_address,
    buildingType: payload.building_type,
    unitDetails: typeof payload.unit_details === 'string' ? payload.unit_details : undefined,
    deliveryNotes: typeof payload.delivery_notes === 'string' ? payload.delivery_notes : 'Meet at door',
    lat: typeof payload.lat === 'number' ? payload.lat : undefined,
    lng: typeof payload.lng === 'number' ? payload.lng : undefined,
    formattedAddress: typeof payload.formatted_address === 'string' ? payload.formatted_address : undefined,
    placeId: typeof payload.place_id === 'string' ? payload.place_id : undefined,
  };
}

function AddressPageContent() {
  const router = useAppRouter();
  const searchParams = useSearchParams();
  const pageT = useTranslations('addressPage');
  const modalT = useTranslations('addressModal');
  const profileT = useTranslations('profile');
  const {
    customerAddress,
    customerName,
    fromNumber,
    userLocation,
    setCustomerAddress,
    setOnboarded,
    setProfilePromptDismissedAt,
    hydrateClientContext,
  } = useCartStore();

  const [routeInitialPosition, setRouteInitialPosition] = React.useState<{ lat: number; lng: number } | null>(
    customerAddress && typeof customerAddress.lat === 'number' && typeof customerAddress.lng === 'number'
      ? { lat: customerAddress.lat, lng: customerAddress.lng }
      : userLocation,
  );
  const [isLoadingAddress, setIsLoadingAddress] = React.useState(!customerAddress);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isLocating, setIsLocating] = React.useState(false);

  const nextPath = React.useMemo(() => resolveNextPath(searchParams.get('next')), [searchParams]);
  const successPath = React.useMemo(() => appendSuccessFlag(nextPath), [nextPath]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(new CustomEvent('fast-eat:address_page_impression', {
      detail: { next: nextPath },
    }));
  }, [nextPath]);

  React.useEffect(() => {
    if (customerAddress) {
      setIsLoadingAddress(false);
      return;
    }

    let cancelled = false;

    async function loadSavedAddress() {
      try {
        const accessToken = await getAccessToken();

        if (!accessToken) {
          if (!cancelled) {
            setIsLoadingAddress(false);
          }
          return;
        }

        const response = await fetch('/api/customer/address', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(pageT('loadError'));
        }

        const data = await response.json();
        const normalizedAddress = normalizeStoredAddress(data?.address);

        if (!cancelled && normalizedAddress) {
          setCustomerAddress(normalizedAddress);
          hydrateClientContext({ customerAddress: normalizedAddress });

          if (typeof normalizedAddress.lat === 'number' && typeof normalizedAddress.lng === 'number') {
            setRouteInitialPosition({ lat: normalizedAddress.lat, lng: normalizedAddress.lng });
          }
        }
      } catch (requestError) {
        if (!cancelled) {
          setLoadError(requestError instanceof Error ? requestError.message : pageT('loadError'));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAddress(false);
        }
      }
    }

    void loadSavedAddress();

    return () => {
      cancelled = true;
    };
  }, [customerAddress, hydrateClientContext, pageT, setCustomerAddress]);

  const handleBack = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fast-eat:address_page_dismiss', {
        detail: { next: nextPath },
      }));
    }

    router.replace(nextPath);
  }, [nextPath, router]);

  const handleUseCurrentLocation = React.useCallback(() => {
    emitHomeEvent({ name: 'location_permission_request' });

    if (!navigator.geolocation) {
      emitHomeEvent({ name: 'location_permission_denied' });
      setLoadError(pageT('geolocationUnavailable'));
      return;
    }

    setIsLocating(true);
    setLoadError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        emitHomeEvent({ name: 'location_permission_granted' });
        setRouteInitialPosition(nextPosition);
        setIsLocating(false);
      },
      () => {
        emitHomeEvent({ name: 'location_permission_denied' });
        setLoadError(pageT('permissionDenied'));
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, [pageT]);

  const handleSave = React.useCallback(async (value: AddressFormValue) => {
    emitHomeEvent({ name: 'address_form_save_click' });

    const normalizedPhone = normalizePhoneWithSinglePlus(fromNumber);

    if (!customerName.trim() || !normalizedPhone) {
      emitHomeEvent({ name: 'address_form_save_error' });
      throw new Error(pageT('profileRequired'));
    }

    const headers = await getAuthenticatedJsonHeaders();
    if (!('Authorization' in headers)) {
      emitHomeEvent({ name: 'address_form_save_error' });
      throw new Error(pageT('authRequired'));
    }

    const response = await fetch('/api/customer/address', {
      method: 'POST',
      headers,
      body: JSON.stringify(value),
    });

    if (!response.ok) {
      emitHomeEvent({ name: 'address_form_save_error' });
      const errorPayload = await response.json().catch(() => null);
      throw new Error(errorPayload?.error || modalT('saveError'));
    }

    const data = await response.json();
    const normalizedAddress = normalizeStoredAddress(data?.address) ?? {
      customerId: customerAddress?.customerId,
      urlAddress: value.urlAddress,
      buildingType: value.buildingType,
      unitDetails: value.unitDetails,
      deliveryNotes: value.deliveryNotes,
      lat: value.lat,
      lng: value.lng,
      formattedAddress: value.formattedAddress,
      placeId: value.placeId,
    };

    try {
      const accessToken = await getAccessToken();

      if (accessToken) {
        await fetch('/api/profile/me', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            urlGoogleMaps: value.urlAddress,
          }),
        });
      }
    } catch {
      // Non-blocking sync; address persistence remains successful.
    }

    setCustomerAddress(normalizedAddress);
    hydrateClientContext({ customerAddress: normalizedAddress });
    setProfilePromptDismissedAt(null);
    setOnboarded(true);
    emitHomeEvent({ name: 'address_form_save_success' });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fast-eat:address_page_conversion', {
        detail: { next: successPath },
      }));
    }

    router.replace(successPath);
  }, [customerAddress?.customerId, customerName, fromNumber, hydrateClientContext, modalT, pageT, router, setCustomerAddress, setOnboarded, setProfilePromptDismissedAt, successPath]);

  const savedAddressLabel = customerAddress?.formattedAddress || customerAddress?.urlAddress || pageT('noSavedAddress');
  const savedCoordinates = customerAddress?.urlAddress ? parseCoordsFromGoogleMapsUrl(customerAddress.urlAddress) : {};

  return (
    <AppShell
      chromeInset="bottom-nav"
      footer={<BottomNav />}
      header={(
        <StickyHeaderBar
          title={pageT('title')}
          subtitle={pageT('subtitle')}
          leadingAction={(
            <Button aria-label={pageT('back')} onClick={handleBack} size="icon" variant="ghost">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
        />
      )}
    >
      <div className="space-y-5 pt-5">
        <Surface className="space-y-4 rounded-[2rem]" variant="raised" padding="lg">
          <SectionHeader
            eyebrow={pageT('savedEyebrow')}
            title={pageT('savedTitle')}
            description={pageT('savedDescription')}
            action={<MapPin className="h-5 w-5 text-orange-600 dark:text-orange-300" />}
          />

          <Surface className="space-y-2 rounded-[1.5rem]" variant="base" padding="lg">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{savedAddressLabel}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {typeof savedCoordinates.lat === 'number' && typeof savedCoordinates.lng === 'number'
                ? pageT('savedCoordinates', {
                    lat: savedCoordinates.lat.toFixed(5),
                    lng: savedCoordinates.lng.toFixed(5),
                  })
                : profileT('savedLocationValue')}
            </p>
          </Surface>

          <div className="flex flex-wrap gap-3">
            <Button
              disabled={isLocating}
              leadingIcon={isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
              onClick={handleUseCurrentLocation}
              size="md"
            >
              {isLocating ? pageT('locating') : pageT('useCurrentLocation')}
            </Button>
          </div>
        </Surface>

        {loadError ? (
          <Surface className="rounded-[1.6rem] text-sm text-amber-700 dark:text-amber-200" variant="raised" padding="lg">
            {loadError}
          </Surface>
        ) : null}

        <Surface className="rounded-[2rem]" variant="base" padding="lg">
          {isLoadingAddress ? (
            <div className="space-y-3">
              <div className="h-6 w-40 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="h-56 w-full animate-pulse rounded-[1.5rem] bg-slate-200 dark:bg-slate-800" />
              <div className="h-12 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-12 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
            </div>
          ) : (
            <AddressDetailsForm
              initialPosition={routeInitialPosition}
              initialValue={customerAddress ?? undefined}
              onPermissionDenied={() => emitHomeEvent({ name: 'location_permission_denied' })}
              onPermissionGranted={() => emitHomeEvent({ name: 'location_permission_granted' })}
              onPermissionRequested={() => emitHomeEvent({ name: 'location_permission_request' })}
              onSave={handleSave}
              onSecondaryAction={handleBack}
              preferCurrentLocationOnOpen={false}
              secondaryActionLabel={pageT('back')}
            />
          )}
        </Surface>
      </div>
    </AppShell>
  );
}

export default function AddressPage() {
  return (
    <React.Suspense>
      <AddressPageContent />
    </React.Suspense>
  );
}