'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import GoogleMapsAddressPicker from '@/components/GoogleMapsAddressPicker';
import { Button, ChoiceCard, FieldMessage, Icon, OptionGroup, TextAreaField, TextField } from '@/../resources/components';
import type { MapsGeocodeData } from '@/services/maps-api';
import type { AddressFormValue, BuildingType } from '@/components/AddressDetailsModal';

const BUILDING_TYPE_OPTIONS: Array<{ value: BuildingType; labelKey: string }> = [
  { value: 'Apartment', labelKey: 'apartment' },
  { value: 'Residential Building', labelKey: 'residentialBuilding' },
  { value: 'Hotel', labelKey: 'hotel' },
  { value: 'Office Building', labelKey: 'officeBuilding' },
  { value: 'Other', labelKey: 'other' },
];

function buildMapsQueryUrl(position: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/search/?api=1&query=${position.lat},${position.lng}`;
}

interface AddressDetailsFormProps {
  initialValue?: Partial<AddressFormValue>;
  initialPosition?: { lat: number; lng: number } | null;
  preferCurrentLocationOnOpen?: boolean;
  onSave: (value: AddressFormValue) => Promise<void>;
  onPermissionRequested?: () => void;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  onTertiaryAction?: () => void;
  tertiaryActionLabel?: string;
}

export default function AddressDetailsForm({
  initialValue,
  initialPosition,
  preferCurrentLocationOnOpen = true,
  onSave,
  onPermissionRequested,
  onPermissionGranted,
  onPermissionDenied,
  onSecondaryAction,
  secondaryActionLabel,
  onTertiaryAction,
  tertiaryActionLabel,
}: AddressDetailsFormProps) {
  const t = useTranslations('addressModal');
  const [urlAddress, setUrlAddress] = React.useState(initialValue?.urlAddress ?? '');
  const [buildingType, setBuildingType] = React.useState<BuildingType>(initialValue?.buildingType ?? 'Apartment');
  const [unitDetails, setUnitDetails] = React.useState(initialValue?.unitDetails ?? '');
  const [deliveryNotes, setDeliveryNotes] = React.useState(initialValue?.deliveryNotes ?? t('defaultDeliveryNote'));
  const [selectedPosition, setSelectedPosition] = React.useState<{ lat: number; lng: number } | null>(initialPosition ?? null);
  const [normalizedAddress, setNormalizedAddress] = React.useState<MapsGeocodeData | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const wasInitializedRef = React.useRef(false);

  React.useEffect(() => {
    if (wasInitializedRef.current) {
      return;
    }

    wasInitializedRef.current = true;
    setUrlAddress(initialValue?.urlAddress ?? '');
    setBuildingType(initialValue?.buildingType ?? 'Apartment');
    setUnitDetails(initialValue?.unitDetails ?? '');
    setDeliveryNotes(initialValue?.deliveryNotes ?? t('defaultDeliveryNote'));

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
    }
  }, [initialPosition, initialValue, t]);

  React.useEffect(() => {
    const nextInitialPosition =
      typeof initialValue?.lat === 'number' && typeof initialValue?.lng === 'number'
        ? { lat: initialValue.lat, lng: initialValue.lng }
        : initialPosition;

    if (!nextInitialPosition) {
      return;
    }

    setSelectedPosition((current) => {
      if (current && Math.abs(current.lat - nextInitialPosition.lat) < 0.000001 && Math.abs(current.lng - nextInitialPosition.lng) < 0.000001) {
        return current;
      }

      return nextInitialPosition;
    });
  }, [initialPosition, initialValue?.lat, initialValue?.lng]);

  const handleSave = React.useCallback(async () => {
    const trimmedUrlAddress = urlAddress.trim();
    const resolvedUrlAddress = trimmedUrlAddress || (selectedPosition ? buildMapsQueryUrl(selectedPosition) : '');

    if (!resolvedUrlAddress) {
      setError(t('saveUrlError'));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        urlAddress: resolvedUrlAddress,
        buildingType,
        unitDetails: unitDetails.trim() || undefined,
        deliveryNotes: deliveryNotes.trim() || t('defaultDeliveryNote'),
        lat: selectedPosition?.lat,
        lng: selectedPosition?.lng,
        formattedAddress: normalizedAddress?.formatted_address,
        placeId: normalizedAddress?.place_id,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('saveError'));
    } finally {
      setIsSaving(false);
    }
  }, [buildingType, deliveryNotes, normalizedAddress, onSave, selectedPosition, t, unitDetails, urlAddress]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">{t('heading')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('description')}</p>
      </div>

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
        onPermissionDenied={onPermissionDenied}
        onPermissionGranted={onPermissionGranted}
        onPermissionRequested={onPermissionRequested}
        preferCurrentLocationOnLoad={preferCurrentLocationOnOpen}
      />

      <TextField
        description={t('urlDescription')}
        id="url-address"
        label={t('urlLabel')}
        leadingIcon={<Icon symbol="map" tone="muted" />}
        onChange={(event) => setUrlAddress(event.target.value)}
        placeholder={t('urlPlaceholder')}
        value={urlAddress}
      />

      <OptionGroup description={t('buildingTypeDescription')} label={t('buildingTypeLabel')}>
        <div className="grid gap-3 sm:grid-cols-2">
          {BUILDING_TYPE_OPTIONS.map((type) => (
            <ChoiceCard
              checked={buildingType === type.value}
              key={type.value}
              onClick={() => setBuildingType(type.value)}
              title={t(`buildingTypes.${type.labelKey}`)}
              type="radio"
            />
          ))}
        </div>
      </OptionGroup>

      <TextField
        id="unit-details"
        label={t('unitDetailsLabel')}
        leadingIcon={<Icon symbol="apartment" tone="muted" />}
        onChange={(event) => setUnitDetails(event.target.value)}
        placeholder={t('unitDetailsPlaceholder')}
        value={unitDetails}
      />

      <TextAreaField
        description={t('deliveryNotesDescription')}
        id="delivery-notes"
        label={t('deliveryNotesLabel')}
        onChange={(event) => setDeliveryNotes(event.target.value)}
        placeholder={t('deliveryNotesPlaceholder')}
        rows={3}
        value={deliveryNotes}
      />

      {error ? <FieldMessage tone="error">{error}</FieldMessage> : null}

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        {onTertiaryAction && tertiaryActionLabel ? (
          <Button onClick={onTertiaryAction} type="button" variant="ghost">
            {tertiaryActionLabel}
          </Button>
        ) : null}
        {onSecondaryAction && secondaryActionLabel ? (
          <Button onClick={onSecondaryAction} type="button" variant="outline">
            {secondaryActionLabel}
          </Button>
        ) : null}
        <Button disabled={isSaving} onClick={handleSave} type="button">
          {isSaving ? t('saving') : t('save')}
        </Button>
      </div>
    </div>
  );
}