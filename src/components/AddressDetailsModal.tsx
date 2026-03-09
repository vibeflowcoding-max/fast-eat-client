"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import GoogleMapsAddressPicker from '@/components/GoogleMapsAddressPicker';
import { Button, ChoiceCard, FieldMessage, Icon, OptionGroup, StickyHeaderBar, Surface, TextAreaField, TextField } from '@/../resources/components';
import type { MapsGeocodeData } from '@/services/maps-api';

export type BuildingType = 'Apartment' | 'Residential Building' | 'Hotel' | 'Office Building' | 'Other';

const BUILDING_TYPE_OPTIONS: Array<{ value: BuildingType; labelKey: string }> = [
  { value: 'Apartment', labelKey: 'apartment' },
  { value: 'Residential Building', labelKey: 'residentialBuilding' },
  { value: 'Hotel', labelKey: 'hotel' },
  { value: 'Office Building', labelKey: 'officeBuilding' },
  { value: 'Other', labelKey: 'other' },
];

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
  const t = useTranslations('addressModal');
  const [urlAddress, setUrlAddress] = React.useState(initialValue?.urlAddress ?? '');
  const [buildingType, setBuildingType] = React.useState<BuildingType>(initialValue?.buildingType ?? 'Apartment');
  const [unitDetails, setUnitDetails] = React.useState(initialValue?.unitDetails ?? '');
  const [deliveryNotes, setDeliveryNotes] = React.useState(initialValue?.deliveryNotes ?? t('defaultDeliveryNote'));
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
    } else {
      setNormalizedAddress(null);
    }
    setError(null);
  }, [initialPosition, initialValue, isOpen, t]);

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
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('saveError'));
    } finally {
      setIsSaving(false);
    }
  }, [buildingType, deliveryNotes, normalizedAddress, onClose, onSave, selectedPosition, t, unitDetails, urlAddress]);

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
              <Button aria-label={t('back')} onClick={onBack} size="icon" variant="ghost">
                <Icon symbol="arrow_back" />
              </Button>
            ) : (
              <span aria-hidden="true" className="block size-11" />
            )
          }
          title={t('title')}
          trailingAction={
            <Button aria-label={t('close')} onClick={onClose} size="icon" variant="ghost">
              <Icon symbol="close" />
            </Button>
          }
        />

        <div className="space-y-5 p-4 sm:p-5">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">{t('heading')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('description')}</p>
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
            {onBack ? (
              <Button onClick={onBack} type="button" variant="ghost">
                {t('back')}
              </Button>
            ) : null}
            <Button onClick={onClose} type="button" variant="outline">
              {t('close')}
            </Button>
            <Button disabled={isSaving} onClick={handleSave} type="button">
              {isSaving ? t('saving') : t('save')}
            </Button>
          </div>
        </div>
      </Surface>
    </div>
  );
}
