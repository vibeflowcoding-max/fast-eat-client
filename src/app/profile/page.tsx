"use client";

import React from 'react';
import { MapPin, Phone, UserRound, Heart, ClipboardList, Loader2, ShieldAlert, Sparkles, Gift, ChevronRight } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useCartStore } from '@/store';
import { useAppLocale } from '@/hooks/useAppLocale';
import { isSupportedLocale, LOCALE_LABELS, SUPPORTED_LOCALES, type AppLocale } from '@/i18n/config';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { normalizePhoneWithSinglePlus } from '@/lib/phone';
import dynamic from 'next/dynamic';
import type { BuildingType } from '@/components/AddressDetailsModal';
import { fetchDietaryProfile } from '@/services/api';

const AddressDetailsModal = dynamic(() => import('@/components/AddressDetailsModal'));
const DietaryProfileSettings = dynamic(() => import('@/features/user/components/DietaryProfileSettings'));

type ProfilePayload = {
  profile: {
    userId: string;
    email: string | null;
    fullName: string | null;
    phone: string;
    urlGoogleMaps: string | null;
  } | null;
  favoriteRestaurants: Array<{ id: string; name: string; logo_url: string | null }>;
};

function initials(fullName: string | null | undefined) {
  if (!fullName) {
    return 'U';
  }

  const parts = fullName.trim().split(/\s+/g);
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'U';
}

export default function ProfilePage() {
  const router = useAppRouter();
  const {
    fromNumber,
    customerName,
    dietaryProfile,
    isAuthenticated,
    setCustomerName,
    setFromNumber,
    setDietaryProfile,
    hydrateClientContext,
  } = useCartStore();
  const { locale, setLocale } = useAppLocale();
  const t = useTranslations('profile');

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [payload, setPayload] = React.useState<ProfilePayload | null>(null);
  const [editFullName, setEditFullName] = React.useState('');
  const [editPhone, setEditPhone] = React.useState('');
  const [saveFeedback, setSaveFeedback] = React.useState<string | null>(null);
  const [languageFeedback, setLanguageFeedback] = React.useState<string | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false);
  const [isDietaryModalOpen, setIsDietaryModalOpen] = React.useState(false);
  const [isResolvingProfileLocation, setIsResolvingProfileLocation] = React.useState(false);
  const [locationInitialPosition, setLocationInitialPosition] = React.useState<{ lat: number; lng: number } | null>(null);

  const parseCoordsFromGoogleMapsUrl = React.useCallback((url: string): { lat?: number; lng?: number } => {
    const match = String(url || '').match(/q=([-\d.]+),([-\d.]+)/i);
    if (!match) {
      return {};
    }

    const lat = Number(match[1]);
    const lng = Number(match[2]);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return {};
    }

    return { lat, lng };
  }, []);

  React.useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError(null);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        if (!accessToken) {
          setPayload({ profile: null, favoriteRestaurants: [] });
          return;
        }

        const profileResponse = await fetch('/api/profile/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const profileData = await profileResponse.json();

        if (!profileResponse.ok) {
          throw new Error(typeof profileData.error === 'string' ? profileData.error : t('loadError'));
        }

        const identityProfile = profileData?.profile ?? null;

        let favoriteRestaurants: Array<{ id: string; name: string; logo_url: string | null }> = [];
        if (identityProfile?.phone) {
          const favoritesResponse = await fetch(
            `/api/customer/profile?phone=${encodeURIComponent(identityProfile.phone)}`,
          );
          const favoritesData = await favoritesResponse.json();

          if (favoritesResponse.ok) {
            favoriteRestaurants = Array.isArray(favoritesData?.favoriteRestaurants)
              ? favoritesData.favoriteRestaurants
              : [];
          }
        }

        setPayload({ profile: identityProfile, favoriteRestaurants });
        setEditFullName(identityProfile?.fullName ?? customerName ?? '');
        setEditPhone(identityProfile?.phone ?? fromNumber ?? '');

        if (identityProfile?.fullName || identityProfile?.phone || identityProfile?.urlGoogleMaps) {
          const normalizedPhone = normalizePhoneWithSinglePlus(identityProfile?.phone ?? '');
          const profileCoords = identityProfile?.urlGoogleMaps
            ? parseCoordsFromGoogleMapsUrl(identityProfile.urlGoogleMaps)
            : {};

          setCustomerName(identityProfile?.fullName ?? '');
          setFromNumber(normalizedPhone);
          hydrateClientContext({
            customerName: identityProfile?.fullName ?? '',
            customerPhone: normalizedPhone,
            customerAddress: identityProfile?.urlGoogleMaps
              ? {
                  urlAddress: identityProfile.urlGoogleMaps,
                  buildingType: 'Other',
                  deliveryNotes: 'Meet at door',
                  lat: profileCoords.lat,
                  lng: profileCoords.lng,
                  formattedAddress: identityProfile.urlGoogleMaps,
                }
              : null,
          });
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : t('loadError'));
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [customerName, fromNumber, hydrateClientContext, parseCoordsFromGoogleMapsUrl, setCustomerName, setFromNumber, t]);

  React.useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let isCancelled = false;

    async function loadDietaryProfile() {
      try {
        const remoteDietaryProfile = await fetchDietaryProfile();
        if (!isCancelled) {
          setDietaryProfile(remoteDietaryProfile);
        }
      } catch {
        // Keep local profile if the remote sync is unavailable.
      }
    }

    loadDietaryProfile();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, setDietaryProfile]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(
      new CustomEvent('fast-eat:language_setting_impression', {
        detail: { source: 'profile_settings', locale },
      }),
    );
  }, [locale]);

  const profile = payload?.profile;
  const favoriteRestaurants = payload?.favoriteRestaurants ?? [];

  const fullName = profile?.fullName ?? customerName ?? t('defaultName');
  const phone = normalizePhoneWithSinglePlus(profile?.phone ?? fromNumber ?? '') || t('noPhone');
  const address = profile?.urlGoogleMaps ?? null;
  const allergies = dietaryProfile?.allergies ?? [];
  const dislikedIngredients = dietaryProfile?.dislikedIngredients ?? [];
  const healthGoals = dietaryProfile?.healthGoals ?? [];
  const dietLabel = dietaryProfile?.diet && dietaryProfile.diet !== 'none' ? dietaryProfile.diet : t('noAllergies');

  const handleProfileSave = async () => {
    setSaveFeedback(null);
    setError(null);

    const normalizedPhone = normalizePhoneWithSinglePlus(editPhone);
    if (!editFullName.trim() || !normalizedPhone) {
      setError('Name and phone are required.');
      return;
    }

    try {
      setSaving(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('You must sign in again to update your profile.');
      }

      const response = await fetch('/api/profile/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fullName: editFullName.trim(),
          phone: normalizedPhone,
          urlGoogleMaps: profile?.urlGoogleMaps ?? null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Could not update profile.');
      }

      setPayload((previous) => ({
        profile: data.profile,
        favoriteRestaurants: previous?.favoriteRestaurants ?? [],
      }));
      setCustomerName(data.profile?.fullName ?? '');
      setFromNumber(normalizePhoneWithSinglePlus(data.profile?.phone ?? ''));
      hydrateClientContext({
        customerName: data.profile?.fullName ?? '',
        customerPhone: data.profile?.phone ?? '',
      });
      setSaveFeedback('Profile updated successfully.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenLocationEditor = () => {
    const coords = profile?.urlGoogleMaps ? parseCoordsFromGoogleMapsUrl(profile.urlGoogleMaps) : {};
    const fallbackPosition =
      typeof coords.lat === 'number' && typeof coords.lng === 'number'
        ? { lat: coords.lat, lng: coords.lng }
        : null;

    if (!navigator.geolocation) {
      setLocationInitialPosition(fallbackPosition);
      setIsLocationModalOpen(true);
      return;
    }

    setIsResolvingProfileLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationInitialPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsResolvingProfileLocation(false);
        setIsLocationModalOpen(true);
      },
      () => {
        setLocationInitialPosition(fallbackPosition);
        setIsResolvingProfileLocation(false);
        setIsLocationModalOpen(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSaveProfileLocation = async (value: {
    urlAddress: string;
    buildingType: BuildingType;
    unitDetails?: string;
    deliveryNotes: string;
    lat?: number;
    lng?: number;
    formattedAddress?: string;
    placeId?: string;
  }) => {
    setSaveFeedback(null);
    setError(null);

    const urlGoogleMaps = String(value.urlAddress || '').trim();
    if (!urlGoogleMaps) {
      throw new Error('Location URL is required.');
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      throw new Error('You must sign in again to update your location.');
    }

    const response = await fetch('/api/profile/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        urlGoogleMaps,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(typeof data?.error === 'string' ? data.error : 'Could not update location.');
    }

    setPayload((previous) => ({
      profile: data.profile,
      favoriteRestaurants: previous?.favoriteRestaurants ?? [],
    }));

    const coords = parseCoordsFromGoogleMapsUrl(urlGoogleMaps);
    hydrateClientContext({
      customerAddress: {
        urlAddress: urlGoogleMaps,
        buildingType: 'Other',
        deliveryNotes: 'Meet at door',
        lat: coords.lat,
        lng: coords.lng,
        formattedAddress: urlGoogleMaps,
      },
    });

    setSaveFeedback(t('locationUpdated'));
  };

  const handleLocaleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const rawLocale = event.target.value;

    if (!isSupportedLocale(rawLocale)) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('fast-eat:language_change_failed', {
            detail: {
              fromLocale: locale,
              attemptedLocale: rawLocale,
              source: 'profile_settings',
              reason: 'unsupported_locale',
            },
          }),
        );
      }
      return;
    }

    const nextLocale: AppLocale = rawLocale;
    setLocale(nextLocale);
    setLanguageFeedback(t('languageUpdated'));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('fast-eat:language_changed', {
          detail: {
            fromLocale: locale,
            toLocale: nextLocale,
            source: 'profile_settings',
          },
        }),
      );
    }
  };

  return (
    <main className="ui-page min-h-screen pb-32">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 space-y-5">
        <header>
          <h1 className="text-3xl font-black tracking-[-0.03em] text-[var(--color-text)]">{t('title')}</h1>
          <p className="ui-text-muted text-sm">{t('subtitle')}</p>
        </header>

        {loading && (
          <div className="ui-panel ui-text-muted flex items-center gap-2 rounded-[1.75rem] p-5 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('loading')}
          </div>
        )}

        {error && (
          <div className="ui-state-danger rounded-[1.75rem] p-5 text-sm">{error}</div>
        )}

        {!loading && !error && (
          <>
            <section className="ui-panel rounded-[2rem] p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-[linear-gradient(135deg,var(--color-brand)_0%,#fb923c_100%)] text-xl font-black text-white shadow-[0_16px_32px_-20px_rgba(236,91,19,0.75)]">
                  {initials(fullName)}
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-[-0.02em] text-[var(--color-text)]">{fullName}</h2>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{t('roleLabel')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="ui-panel-soft rounded-[1.4rem] p-4">
                  <p className="mb-1 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{t('phone')}</p>
                  <p className="inline-flex items-center gap-2 text-[var(--color-text)]"><Phone className="w-4 h-4 text-[var(--color-brand)]" />{phone}</p>
                </div>
                <div className="ui-panel-soft rounded-[1.4rem] p-4">
                  <p className="mb-1 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{t('name')}</p>
                  <p className="inline-flex items-center gap-2 text-[var(--color-text)]"><UserRound className="w-4 h-4 text-[var(--color-brand)]" />{fullName}</p>
                </div>
              </div>

              <div className="ui-panel-soft rounded-[1.5rem] p-4 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Edit profile</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-sm font-semibold text-[var(--color-text)]">
                    {t('name')}
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(event) => setEditFullName(event.target.value)}
                      className="ui-input mt-1 rounded-xl px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm font-semibold text-[var(--color-text)]">
                    {t('phone')}
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(event) => setEditPhone(event.target.value)}
                      className="ui-input mt-1 rounded-xl px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleProfileSave}
                  disabled={saving}
                  className="ui-btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-black transition-colors disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save profile
                </button>
                {saveFeedback ? <p className="ui-state-success inline-flex rounded-xl px-3 py-2 text-xs">{saveFeedback}</p> : null}
              </div>

              <div className="ui-panel-soft rounded-[1.5rem] p-4 text-sm">
                <p className="mb-1 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{t('location')}</p>
                <p className="inline-flex items-start gap-2 text-[var(--color-text)]"><MapPin className="mt-0.5 h-4 w-4 text-[var(--color-brand)]" />{address ?? t('noAddress')}</p>
                <button
                  type="button"
                  onClick={handleOpenLocationEditor}
                  disabled={isResolvingProfileLocation}
                  className="ui-btn-secondary mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black"
                >
                  {isResolvingProfileLocation
                    ? t('resolvingLocation')
                    : (address ? t('changeLocation') : t('setLocation'))}
                </button>
              </div>

              <button
                type="button"
                onClick={() => router.push('/orders')}
                className="ui-btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-black transition-colors"
              >
                <ClipboardList className="w-4 h-4" />
                {t('viewOrders')}
              </button>
            </section>

            <section className="ui-panel rounded-[2rem] p-5 space-y-3">
              <h3 className="text-sm font-black text-[var(--color-text)] inline-flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                {t('favoriteRestaurants')}
              </h3>

              {favoriteRestaurants.length === 0 ? (
                <p className="ui-text-muted text-sm">{t('noFavorites')}</p>
              ) : (
                <div className="space-y-2">
                  {favoriteRestaurants.map((restaurant) => (
                    <article key={restaurant.id} className="ui-list-card rounded-[1.35rem] px-4 py-3 text-sm text-[var(--color-text)]">
                      {restaurant.name}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="ui-panel rounded-[2rem] p-5 space-y-3">
              <h3 className="text-sm font-black text-[var(--color-text)] inline-flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                {t('allergiesSettings')}
              </h3>

              <div className="ui-panel-soft rounded-[1.5rem] p-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Perfil alimenticio</p>
                    <p className="text-[var(--color-text)] font-semibold">{dietLabel}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${dietaryProfile?.syncStatus === 'synced' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {dietaryProfile?.syncStatus === 'synced' ? 'Synced' : 'Local'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {allergies.map((allergy) => (
                    <span key={allergy} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      {allergy}
                    </span>
                  ))}
                  {dislikedIngredients.slice(0, 3).map((ingredient) => (
                    <span key={ingredient} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                      Evitar: {ingredient}
                    </span>
                  ))}
                  {healthGoals.slice(0, 2).map((goal) => (
                    <span key={goal} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {goal}
                    </span>
                  ))}
                  {allergies.length === 0 && dislikedIngredients.length === 0 && healthGoals.length === 0 ? (
                    <p className="ui-text-muted text-sm">{t('noAllergies')}</p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setIsDietaryModalOpen(true)}
                  className="ui-btn-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black"
                >
                  Ajustar perfil alimenticio
                </button>
              </div>

              {allergies.length === 0 ? (
                <p className="ui-text-muted text-sm">{t('noAllergies')}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allergies.map((allergy) => (
                    <span key={allergy} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      {allergy}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="ui-panel rounded-[2rem] p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-[var(--color-text)] inline-flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--color-brand)]" />
                    Planner IA
                  </h3>
                  <p className="ui-text-muted text-sm">Recibe ideas de platos según tu dieta, gustos y momento del día.</p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/planner')}
                  className="ui-btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black"
                >
                  Abrir
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </section>

            <section className="ui-panel rounded-[2rem] p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-[var(--color-text)] inline-flex items-center gap-2">
                    <Gift className="w-4 h-4 text-fuchsia-600" />
                    Mystery Box
                  </h3>
                  <p className="ui-text-muted text-sm">Descubre combos sorpresa compatibles con tu perfil y stock disponible.</p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/mystery-box')}
                  className="ui-btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black"
                >
                  Ver ofertas
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </section>

            <section className="ui-panel rounded-[2rem] p-5 space-y-3">
              <h3 className="text-sm font-black text-[var(--color-text)]">{t('languageSection')}</h3>
              <p className="ui-text-muted text-sm">{t('languageDescription')}</p>
              <label className="block text-sm font-semibold text-[var(--color-text)]" htmlFor="profile-language-select">
                {t('languageLabel')}
              </label>
              <select
                id="profile-language-select"
                value={locale}
                onChange={handleLocaleChange}
                className="ui-select rounded-xl px-3 py-2 text-sm"
              >
                {SUPPORTED_LOCALES.map((itemLocale) => (
                  <option key={itemLocale} value={itemLocale}>
                    {LOCALE_LABELS[itemLocale]}
                  </option>
                ))}
              </select>
              {languageFeedback ? <p className="text-xs text-emerald-700">{languageFeedback}</p> : null}
            </section>
          </>
        )}
      </div>

      <BottomNav />

      <AddressDetailsModal
        isOpen={isLocationModalOpen}
        initialValue={{
          urlAddress: profile?.urlGoogleMaps || '',
          buildingType: 'Other',
          deliveryNotes: 'Meet at door',
          formattedAddress: profile?.urlGoogleMaps || undefined,
          lat: locationInitialPosition?.lat,
          lng: locationInitialPosition?.lng,
        }}
        initialPosition={locationInitialPosition}
        onClose={() => setIsLocationModalOpen(false)}
        onSave={handleSaveProfileLocation}
        preferCurrentLocationOnOpen={false}
      />

      <DietaryProfileSettings
        isOpen={isDietaryModalOpen}
        onClose={() => setIsDietaryModalOpen(false)}
      />
    </main>
  );
}
