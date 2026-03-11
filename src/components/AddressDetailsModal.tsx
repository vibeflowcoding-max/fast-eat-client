"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import AddressDetailsForm from '@/components/AddressDetailsForm';
import { Button, Icon, StickyHeaderBar, Surface } from '@/../resources/components';

export type BuildingType = 'Apartment' | 'Residential Building' | 'Hotel' | 'Office Building' | 'Other';

export interface AddressFormValue {
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
          <AddressDetailsForm
            initialPosition={initialPosition}
            initialValue={initialValue}
            onPermissionDenied={onPermissionDenied}
            onPermissionGranted={onPermissionGranted}
            onPermissionRequested={onPermissionRequested}
            onSave={async (value) => {
              await onSave(value);
              onClose();
            }}
            onSecondaryAction={onClose}
            onTertiaryAction={onBack}
            preferCurrentLocationOnOpen={preferCurrentLocationOnOpen}
            secondaryActionLabel={t('close')}
            tertiaryActionLabel={onBack ? t('back') : undefined}
          />
        </div>
      </Surface>
    </div>
  );
}
