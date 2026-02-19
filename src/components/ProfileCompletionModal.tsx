"use client";

import React from 'react';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  initialName?: string;
  initialPhone?: string;
  hasConfiguredAddress: boolean;
  locationRequestLoading?: boolean;
  locationPermissionError?: string | null;
  onRequestLocation: () => void;
  onEnterAddressManually?: (value: { name: string; phone: string }) => void;
  onContinue: (value: { name: string; phone: string }) => Promise<void>;
  onClose: () => void;
}

function isPhoneValid(value: string): boolean {
  const cleaned = value.replace(/\D/g, '');
  const crRegex = /^[678]\d{7}$/;
  const intlRegex = /^\d{10,15}$/;
  return crRegex.test(cleaned) || intlRegex.test(cleaned);
}

export default function ProfileCompletionModal({
  isOpen,
  initialName,
  initialPhone,
  hasConfiguredAddress,
  locationRequestLoading = false,
  locationPermissionError,
  onRequestLocation,
  onEnterAddressManually,
  onContinue,
  onClose
}: ProfileCompletionModalProps) {
  const [name, setName] = React.useState(initialName ?? '');
  const [phone, setPhone] = React.useState(initialPhone ?? '');
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    setName(initialName ?? '');
    setPhone(initialPhone ?? '');
    setError(null);
  }, [initialName, initialPhone, isOpen]);

  const handleEnterAddressManually = React.useCallback(() => {
    if (!onEnterAddressManually) {
      return;
    }

    if (!name.trim()) {
      setError('Full name is required before adding address.');
      return;
    }

    if (!phone.trim()) {
      setError('Number is required before adding address.');
      return;
    }

    if (!isPhoneValid(phone)) {
      setError('Please enter a valid phone number before adding address.');
      return;
    }

    setError(null);
    onEnterAddressManually({ name: name.trim(), phone: phone.trim() });
  }, [name, onEnterAddressManually, phone]);

  const handleContinue = React.useCallback(async () => {
    if (!name.trim()) {
      setError('Full name is required.');
      return;
    }

    if (!phone.trim()) {
      setError('Number is required.');
      return;
    }

    if (!isPhoneValid(phone)) {
      setError('Please enter a valid phone number.');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await onContinue({ name: name.trim(), phone: phone.trim() });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save profile data.');
    } finally {
      setIsSaving(false);
    }
  }, [name, onClose, onContinue, phone]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 sm:max-w-md sm:rounded-2xl">
        <h2 className="text-lg font-semibold text-gray-900">Complete your profile</h2>
        <p className="mt-1 text-sm text-gray-500">Add your details so we can improve delivery experience.</p>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="profile-name" className="mb-1 block text-sm font-medium text-gray-700">Full name</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label htmlFor="profile-phone" className="mb-1 block text-sm font-medium text-gray-700">Number</label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-sm font-medium text-gray-800">Address</p>
            {hasConfiguredAddress ? (
              <p className="mt-1 text-xs text-green-700">Ubicación configurada</p>
            ) : (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={onRequestLocation}
                  disabled={locationRequestLoading}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                >
                  {locationRequestLoading ? 'Requesting permission...' : 'Permitir ubicación'}
                </button>
              </div>
            )}
            {locationPermissionError && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-amber-700" aria-live="polite">
                  {locationPermissionError}
                </p>
                {onEnterAddressManually && (
                  <button
                    type="button"
                    onClick={handleEnterAddressManually}
                    className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700"
                  >
                    Enter address manually
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600" aria-live="polite">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
          >
            Later
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={isSaving}
            className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
          >
            {isSaving ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
