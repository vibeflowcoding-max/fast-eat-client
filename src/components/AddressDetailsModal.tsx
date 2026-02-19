"use client";

import React from 'react';
import GoogleMapsAddressPicker from '@/components/GoogleMapsAddressPicker';
import type { MapsGeocodeData } from '@/services/maps-api';

export type BuildingType = 'Apartment' | 'Residential Building' | 'Hotel' | 'Office Building' | 'Other';

interface AddressFormValue {
  urlAddress: string;
  buildingType: BuildingType;
  unitDetails?: string;
  deliveryNotes: string;
  lat?: number;
  lng?: number;
  formattedAddress?: string;
  placeId?: string;
}

interface AddressDetailsModalProps {
  isOpen: boolean;
  initialValue?: Partial<AddressFormValue>;
  initialPosition?: { lat: number; lng: number } | null;
  onClose: () => void;
  onBack?: () => void;
  onSave: (value: AddressFormValue) => Promise<void>;
  onPermissionRequested?: () => void;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

function buildMapsQueryUrl(position: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/search/?api=1&query=${position.lat},${position.lng}`;
}

const BUILDING_TYPES: BuildingType[] = [
  'Apartment',
  'Residential Building',
  'Hotel',
  'Office Building',
  'Other'
];

export default function AddressDetailsModal({
  isOpen,
  initialValue,
  initialPosition,
  onClose,
  onBack,
  onSave,
  onPermissionRequested,
  onPermissionGranted,
  onPermissionDenied
}: AddressDetailsModalProps) {
  const [urlAddress, setUrlAddress] = React.useState(initialValue?.urlAddress ?? '');
  const [buildingType, setBuildingType] = React.useState<BuildingType>(initialValue?.buildingType ?? 'Apartment');
  const [unitDetails, setUnitDetails] = React.useState(initialValue?.unitDetails ?? '');
  const [deliveryNotes, setDeliveryNotes] = React.useState(initialValue?.deliveryNotes ?? 'Meet at door');
  const [selectedPosition, setSelectedPosition] = React.useState<{ lat: number; lng: number } | null>(initialPosition ?? null);
  const [normalizedAddress, setNormalizedAddress] = React.useState<MapsGeocodeData | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    setUrlAddress(initialValue?.urlAddress ?? '');
    setBuildingType(initialValue?.buildingType ?? 'Apartment');
    setUnitDetails(initialValue?.unitDetails ?? '');
    setDeliveryNotes(initialValue?.deliveryNotes ?? 'Meet at door');
    const resolvedInitialPosition =
      typeof initialValue?.lat === 'number' && typeof initialValue?.lng === 'number'
        ? { lat: initialValue.lat, lng: initialValue.lng }
        : (initialPosition ?? null);

    setSelectedPosition(resolvedInitialPosition);

    if (initialValue?.formattedAddress && initialValue?.placeId && resolvedInitialPosition) {
      setNormalizedAddress({
        formatted_address: initialValue.formattedAddress,
        place_id: initialValue.placeId,
        location: resolvedInitialPosition,
        components: {},
      });
    } else {
      setNormalizedAddress(null);
    }
    setError(null);
  }, [initialPosition, initialValue, isOpen]);

  const handleSave = React.useCallback(async () => {
    const trimmedUrlAddress = urlAddress.trim();
    const resolvedUrlAddress = trimmedUrlAddress || (selectedPosition ? buildMapsQueryUrl(selectedPosition) : '');

    if (!resolvedUrlAddress) {
      setError('Please provide a Google Maps URL before saving.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        urlAddress: resolvedUrlAddress,
        buildingType,
        unitDetails: unitDetails.trim() || undefined,
        deliveryNotes: deliveryNotes.trim() || 'Meet at door',
        lat: selectedPosition?.lat,
        lng: selectedPosition?.lng,
        formattedAddress: normalizedAddress?.formatted_address,
        placeId: normalizedAddress?.place_id,
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save address. Please retry.');
    } finally {
      setIsSaving(false);
    }
  }, [buildingType, deliveryNotes, normalizedAddress, onClose, onSave, selectedPosition, unitDetails, urlAddress]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 sm:max-w-lg sm:rounded-2xl">
        <h2 className="text-lg font-semibold text-gray-900">Address details</h2>

        <div className="mt-4">
          <GoogleMapsAddressPicker
            initialUrl={urlAddress}
            initialPosition={selectedPosition}
            onChange={(nextUrl, nextPosition, normalized) => {
              setUrlAddress(nextUrl);
              setSelectedPosition(nextPosition);
              setNormalizedAddress(normalized ?? null);
              if (error) {
                setError(null);
              }
            }}
            onPermissionRequested={onPermissionRequested}
            onPermissionGranted={onPermissionGranted}
            onPermissionDenied={onPermissionDenied}
          />
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="building-type" className="mb-1 block text-sm font-medium text-gray-700">
              Building Type
            </label>
            <select
              id="building-type"
              value={buildingType}
              onChange={(event) => setBuildingType(event.target.value as BuildingType)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
            >
              {BUILDING_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="unit-details" className="mb-1 block text-sm font-medium text-gray-700">
              Apartment/Suite/Floor
            </label>
            <input
              id="unit-details"
              type="text"
              value={unitDetails}
              onChange={(event) => setUnitDetails(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label htmlFor="delivery-notes" className="mb-1 block text-sm font-medium text-gray-700">
              Delivery notes
            </label>
            <textarea
              id="delivery-notes"
              value={deliveryNotes}
              onChange={(event) => setDeliveryNotes(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600" aria-live="polite">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
          >
            {isSaving ? 'Saving...' : 'Save Address'}
          </button>
        </div>
      </div>
    </div>
  );
}
