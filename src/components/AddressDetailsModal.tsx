"use client";

import React from 'react';
import GoogleMapsAddressPicker from '@/components/GoogleMapsAddressPicker';
import { Button, ChoiceCard, FieldMessage, Icon, OptionGroup, StickyHeaderBar, Surface, TextAreaField, TextField } from '@/../resources/components';
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
  preferCurrentLocationOnOpen?: boolean;
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
  preferCurrentLocationOnOpen = true,
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
  const wasOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }

    if (wasOpenRef.current) {
      return;
    }

    wasOpenRef.current = true;

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
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/40 sm:items-center">
      <Surface className="max-h-[90vh] w-full overflow-y-auto rounded-t-[2rem] p-0 sm:max-w-2xl sm:rounded-[2rem]" padding="none" variant="base">
        <StickyHeaderBar
          className="rounded-t-[2rem]"
          leadingAction={
            onBack ? (
              <Button aria-label="Back" onClick={onBack} size="icon" variant="ghost">
                <Icon symbol="arrow_back" />
              </Button>
            ) : (
              <span aria-hidden="true" className="block size-11" />
            )
          }
          title="Delivery address"
          trailingAction={
            <Button aria-label="Close" onClick={onClose} size="icon" variant="ghost">
              <Icon symbol="close" />
            </Button>
          }
        />

        <div className="space-y-5 p-4 sm:p-5">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Where should we deliver?</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Pick the pin or paste a Google Maps address so the app can use it across checkout and profile.</p>
          </div>

          <GoogleMapsAddressPicker
            initialUrl={urlAddress}
            initialPosition={selectedPosition}
            preferCurrentLocationOnLoad={preferCurrentLocationOnOpen}
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

          <TextField
            description="You can leave this blank if you are only placing the pin on the map."
            id="url-address"
            label="Google Maps URL"
            leadingIcon={<Icon symbol="map" tone="muted" />}
            onChange={(event) => setUrlAddress(event.target.value)}
            placeholder="https://www.google.com/maps/search/?api=1&query=..."
            value={urlAddress}
          />

          <OptionGroup description="This helps delivery instructions feel more specific when the address is reopened later." label="Building type">
            <div className="grid gap-3 sm:grid-cols-2">
              {BUILDING_TYPES.map((type) => (
                <ChoiceCard
                  checked={buildingType === type}
                  key={type}
                  onClick={() => setBuildingType(type)}
                  title={type}
                  type="radio"
                />
              ))}
            </div>
          </OptionGroup>

          <TextField
            id="unit-details"
            label="Apartment, suite or floor"
            leadingIcon={<Icon symbol="apartment" tone="muted" />}
            onChange={(event) => setUnitDetails(event.target.value)}
            placeholder="Apto 8B, piso 3"
            value={unitDetails}
          />

          <TextAreaField
            description="Anything the driver should know when arriving at the building."
            id="delivery-notes"
            label="Delivery notes"
            onChange={(event) => setDeliveryNotes(event.target.value)}
            placeholder="Meet at the lobby, call on arrival, leave with concierge..."
            rows={3}
            value={deliveryNotes}
          />

          {error ? <FieldMessage tone="error">{error}</FieldMessage> : null}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            {onBack ? (
              <Button onClick={onBack} type="button" variant="ghost">
                Back
              </Button>
            ) : null}
            <Button onClick={onClose} type="button" variant="outline">
              Close
            </Button>
            <Button disabled={isSaving} onClick={handleSave} type="button">
              {isSaving ? 'Saving...' : 'Save address'}
            </Button>
          </div>
        </div>
      </Surface>
    </div>
  );
}
