import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BuildingType } from '@/components/AddressDetailsModal';
import { emitHomeEvent } from '@/features/home-discovery/analytics';
import { getAccessToken, getAuthenticatedJsonHeaders } from '@/lib/client-auth';

interface CustomerAddress {
  customerId?: string;
  urlAddress: string;
  buildingType: 'Apartment' | 'Residential Building' | 'Hotel' | 'Office Building' | 'Other';
  unitDetails?: string;
  deliveryNotes: string;
  lat?: number;
  lng?: number;
  formattedAddress?: string;
  placeId?: string;
}

interface UseHomeAddressRecoveryOptions {
  isAuthenticated: boolean;
  customerName: string;
  fromNumber: string;
  customerAddress: CustomerAddress | null;
  userLocation: { lat: number; lng: number } | null;
  setCustomerAddress: (address: CustomerAddress) => void;
  setOnboarded: (value: boolean) => void;
  setProfilePromptDismissedAt: (value: number | null) => void;
  t: (key: string) => string;
}

export function useHomeAddressRecovery({
  isAuthenticated,
  customerName,
  fromNumber,
  customerAddress,
  userLocation,
  setCustomerAddress,
  setOnboarded,
  setProfilePromptDismissedAt,
  t,
}: UseHomeAddressRecoveryOptions) {
  const router = useRouter();
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [locationRequestLoading, setLocationRequestLoading] = useState(false);
  const [locationPermissionError, setLocationPermissionError] = useState<string | null>(null);
  const [manualAddressInitialPosition, setManualAddressInitialPosition] = useState<{ lat: number; lng: number } | null>(null);
  const addressInitialPosition = manualAddressInitialPosition ?? userLocation ?? null;

  useEffect(() => {
    if (!isAuthenticated || customerAddress) {
      return;
    }

    const controller = new AbortController();

    async function loadAddress() {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return;
      }

      const response = await fetch('/api/customer/address', {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Could not fetch customer address');
      }

      const data = await response.json();
      if (!data?.address) {
        return;
      }

      const nextAddress = {
        customerId: data.address.customer_id,
        urlAddress: data.address.url_address,
        buildingType: data.address.building_type,
        unitDetails: data.address.unit_details ?? undefined,
        deliveryNotes: data.address.delivery_notes,
        lat: typeof data.address.lat === 'number' ? data.address.lat : undefined,
        lng: typeof data.address.lng === 'number' ? data.address.lng : undefined,
        formattedAddress: typeof data.address.formatted_address === 'string' ? data.address.formatted_address : undefined,
        placeId: typeof data.address.place_id === 'string' ? data.address.place_id : undefined,
      } as CustomerAddress;

      setCustomerAddress(nextAddress);

      if (typeof nextAddress.lat === 'number' && typeof nextAddress.lng === 'number') {
        setManualAddressInitialPosition({ lat: nextAddress.lat, lng: nextAddress.lng });
      }
    }

    loadAddress().catch((error) => {
      if ((error as { name?: string })?.name === 'AbortError') {
        return;
      }
    });

    return () => controller.abort();
  }, [customerAddress, isAuthenticated, setCustomerAddress]);

  const handleOpenProfileCompletion = useCallback(() => {
    router.push('/onboarding/profile');
    emitHomeEvent({ name: 'profile_prompt_click' });
  }, [router]);

  const handleDismissProfilePrompt = useCallback(() => {
    setProfilePromptDismissedAt(Date.now());
    emitHomeEvent({ name: 'profile_prompt_dismiss' });
  }, [setProfilePromptDismissedAt]);

  const handleRequestLocationFromProfile = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationPermissionError(t('errors.geolocationUnsupported'));
      setIsAddressModalOpen(true);
      return;
    }

    emitHomeEvent({ name: 'location_permission_request' });
    setLocationRequestLoading(true);
    setLocationPermissionError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setManualAddressInitialPosition(nextPosition);
        setIsAddressModalOpen(true);
        emitHomeEvent({ name: 'location_permission_granted' });
        setLocationRequestLoading(false);
      },
      () => {
        setLocationPermissionError(t('errors.permissionDenied'));
        setIsAddressModalOpen(true);
        emitHomeEvent({ name: 'location_permission_denied' });
        setLocationRequestLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, [t]);

  const handleSaveAddress = useCallback(async (value: {
    urlAddress: string;
    buildingType: BuildingType;
    unitDetails?: string;
    deliveryNotes: string;
    lat?: number;
    lng?: number;
    formattedAddress?: string;
    placeId?: string;
  }) => {
    emitHomeEvent({ name: 'address_form_save_click' });

    if (!customerName.trim() || !fromNumber.trim()) {
      setIsAddressModalOpen(false);
      setLocationPermissionError(t('errors.namePhoneRequired'));
      router.push('/profile');
      throw new Error(t('errors.namePhoneRequiredAddress'));
    }

    const headers = await getAuthenticatedJsonHeaders();
    if (!('Authorization' in headers)) {
      throw new Error(t('errors.saveAddress'));
    }

    const response = await fetch('/api/customer/address', {
      method: 'POST',
      headers,
      body: JSON.stringify(value),
    });

    if (!response.ok) {
      emitHomeEvent({ name: 'address_form_save_error' });
      const errorPayload = await response.json().catch(() => null);
      throw new Error(errorPayload?.error || t('errors.saveAddress'));
    }

    const data = await response.json();

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
      // Non-blocking sync; customer address save remains successful even if profile sync fails.
    }

    setCustomerAddress({
      customerId: data.address?.customer_id,
      urlAddress: value.urlAddress,
      buildingType: value.buildingType,
      unitDetails: value.unitDetails,
      deliveryNotes: value.deliveryNotes,
      lat: value.lat,
      lng: value.lng,
      formattedAddress: value.formattedAddress,
      placeId: value.placeId,
    });
    setProfilePromptDismissedAt(null);
    setOnboarded(true);
    emitHomeEvent({ name: 'address_form_save_success' });
    setLocationPermissionError(null);
    setIsAddressModalOpen(false);
  }, [customerName, fromNumber, router, setCustomerAddress, setOnboarded, setProfilePromptDismissedAt, t]);

  return {
    addressInitialPosition,
    handleDismissProfilePrompt,
    handleOpenProfileCompletion,
    handleRequestLocationFromProfile,
    handleSaveAddress,
    isAddressModalOpen,
    locationPermissionError,
    locationRequestLoading,
    setIsAddressModalOpen,
  };
}