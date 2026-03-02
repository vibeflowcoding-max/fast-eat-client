"use client";

import React from 'react';
import { MapPin, Phone, UserRound, Heart, ClipboardList, Loader2, ShieldAlert } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useCartStore } from '@/store';
import { useAppLocale } from '@/hooks/useAppLocale';
import { isSupportedLocale, LOCALE_LABELS, SUPPORTED_LOCALES, type AppLocale } from '@/i18n/config';
import { useTranslations } from 'next-intl';

type ProfilePayload = {
  profile: {
    customerId: string;
    fullName: string | null;
    phone: string;
    address: string | null;
    buildingType: string | null;
    unitDetails: string | null;
    deliveryNotes: string | null;
    allergies: string[];
    dietaryPreferences: string[];
    dietaryStrictness: string | null;
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
  const { fromNumber, customerName, customerAddress, dietaryProfile } = useCartStore();
  const { locale, setLocale } = useAppLocale();
  const t = useTranslations('profile');

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [payload, setPayload] = React.useState<ProfilePayload | null>(null);
  const [languageFeedback, setLanguageFeedback] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError(null);

      try {
        if (!fromNumber) {
          setPayload({ profile: null, favoriteRestaurants: [] });
          return;
        }

        const response = await fetch(`/api/customer/profile?phone=${encodeURIComponent(fromNumber)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(typeof data.error === 'string' ? data.error : t('loadError'));
        }

        setPayload(data);
      } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : t('loadError'));
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [fromNumber, t]);

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
  const phone = profile?.phone ?? fromNumber ?? t('noPhone');
  const address = profile?.address ?? customerAddress?.urlAddress ?? null;
  const allergies = profile?.allergies?.length ? profile.allergies : dietaryProfile?.allergies ?? [];

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
    <main className="min-h-screen bg-gray-50 pb-32">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 space-y-5">
        <header>
          <h1 className="text-2xl font-black text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500">{t('subtitle')}</p>
        </header>

        {loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('loading')}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && (
          <>
            <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white font-black text-xl flex items-center justify-center">
                  {initials(fullName)}
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900">{fullName}</h2>
                  <p className="text-xs text-gray-500">{t('roleLabel')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-gray-200 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-1">{t('phone')}</p>
                  <p className="inline-flex items-center gap-2 text-gray-900"><Phone className="w-4 h-4 text-gray-500" />{phone}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-1">{t('name')}</p>
                  <p className="inline-flex items-center gap-2 text-gray-900"><UserRound className="w-4 h-4 text-gray-500" />{fullName}</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-3 text-sm">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-1">{t('location')}</p>
                <p className="inline-flex items-start gap-2 text-gray-900"><MapPin className="w-4 h-4 text-gray-500 mt-0.5" />{address ?? t('noAddress')}</p>
              </div>

              <button
                type="button"
                onClick={() => router.push('/orders')}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-black transition-colors"
              >
                <ClipboardList className="w-4 h-4" />
                {t('viewOrders')}
              </button>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
              <h3 className="text-sm font-black text-gray-900 inline-flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                {t('favoriteRestaurants')}
              </h3>

              {favoriteRestaurants.length === 0 ? (
                <p className="text-sm text-gray-600">{t('noFavorites')}</p>
              ) : (
                <div className="space-y-2">
                  {favoriteRestaurants.map((restaurant) => (
                    <article key={restaurant.id} className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800">
                      {restaurant.name}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
              <h3 className="text-sm font-black text-gray-900 inline-flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                {t('allergiesSettings')}
              </h3>

              {allergies.length === 0 ? (
                <p className="text-sm text-gray-600">{t('noAllergies')}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allergies.map((allergy) => (
                    <span key={allergy} className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
                      {allergy}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
              <h3 className="text-sm font-black text-gray-900">{t('languageSection')}</h3>
              <p className="text-sm text-gray-600">{t('languageDescription')}</p>
              <label className="block text-sm font-semibold text-gray-700" htmlFor="profile-language-select">
                {t('languageLabel')}
              </label>
              <select
                id="profile-language-select"
                value={locale}
                onChange={handleLocaleChange}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-400"
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
    </main>
  );
}
