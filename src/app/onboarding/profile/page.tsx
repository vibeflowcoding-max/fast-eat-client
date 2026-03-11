'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, MapPin, Sparkles, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AppShell, Button, SectionHeader, Surface, TextField, StickyHeaderBar } from '@/../resources/components';
import BottomNav from '@/components/BottomNav';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useCartStore } from '@/store';
import { supabase } from '@/lib/supabase';
import { normalizePhoneWithSinglePlus } from '@/lib/phone';

function isPhoneValid(value: string): boolean {
  const cleaned = value.replace(/\D/g, '');
  const crRegex = /^[678]\d{7}$/;
  const intlRegex = /^\d{10,15}$/;
  return crRegex.test(cleaned) || intlRegex.test(cleaned);
}

export default function OnboardingProfilePage() {
  const router = useAppRouter();
  const t = useTranslations('onboardingProfile');
  const {
    customerName,
    fromNumber,
    customerAddress,
    setCustomerName,
    setFromNumber,
    hydrateClientContext,
  } = useCartStore();

  const [name, setName] = React.useState(customerName ?? '');
  const [phone, setPhone] = React.useState(fromNumber ?? '');
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(new CustomEvent('fast-eat:onboarding_profile_impression', {
      detail: { hasAddress: Boolean(customerAddress?.urlAddress) },
    }));
  }, [customerAddress?.urlAddress]);

  const handleDismiss = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fast-eat:onboarding_profile_dismiss', {
        detail: { target: 'home' },
      }));
    }

    router.replace('/');
  }, [router]);

  const handleSaveProfile = React.useCallback(async () => {
    if (!name.trim()) {
      setError(t('errors.fullNameRequired'));
      return false;
    }

    if (!phone.trim()) {
      setError(t('errors.phoneRequired'));
      return false;
    }

    if (!isPhoneValid(phone)) {
      setError(t('errors.phoneInvalid'));
      return false;
    }

    setIsSaving(true);
    setError(null);

    try {
      const normalizedPhone = normalizePhoneWithSinglePlus(phone);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error(t('errors.authRequired'));
      }

      const response = await fetch('/api/profile/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fullName: name.trim(),
          phone: normalizedPhone,
          urlGoogleMaps: customerAddress?.urlAddress ?? null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : t('errors.saveFailed'));
      }

      setCustomerName(data.profile?.fullName ?? name.trim());
      setFromNumber(normalizePhoneWithSinglePlus(data.profile?.phone ?? normalizedPhone));
      hydrateClientContext({
        customerName: data.profile?.fullName ?? name.trim(),
        customerPhone: data.profile?.phone ?? normalizedPhone,
      });

      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('errors.saveFailed'));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [customerAddress?.urlAddress, hydrateClientContext, name, phone, setCustomerName, setFromNumber, t]);

  const handleContinue = React.useCallback(async () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fast-eat:onboarding_profile_click', {
        detail: { action: 'continue' },
      }));
    }

    const didSave = await handleSaveProfile();
    if (!didSave) {
      return;
    }

    const target = customerAddress?.urlAddress ? '/' : '/address?next=%2F';

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fast-eat:onboarding_profile_conversion', {
        detail: { target },
      }));
    }

    router.replace(target);
  }, [customerAddress?.urlAddress, handleSaveProfile, router]);

  const handleOpenAddressStep = React.useCallback(async () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fast-eat:onboarding_profile_click', {
        detail: { action: 'address_step' },
      }));
    }

    const didSave = await handleSaveProfile();
    if (!didSave) {
      return;
    }

    router.push('/address?next=%2F');
  }, [handleSaveProfile, router]);

  return (
    <AppShell
      chromeInset="bottom-nav"
      footer={<BottomNav />}
      header={(
        <StickyHeaderBar
          title={t('pageTitle')}
          subtitle={t('pageSubtitle')}
          leadingAction={(
            <Button aria-label={t('back')} onClick={handleDismiss} size="icon" variant="ghost">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
        />
      )}
    >
      <div className="space-y-5 pt-5">
        <Surface className="relative overflow-hidden rounded-[2rem]" variant="raised" padding="lg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.18),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.16),transparent_38%)]" />
          <div className="relative space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">
                  {t('eyebrow')}
                </p>
                <h2 className="max-w-[16ch] text-3xl font-black tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                  {t('heroTitle')}
                </h2>
                <p className="max-w-[34ch] text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {t('heroDescription')}
                </p>
              </div>
              <div className="flex size-14 shrink-0 items-center justify-center rounded-[1.4rem] bg-white/85 text-orange-600 shadow-[0_14px_34px_-22px_rgba(234,88,12,0.8)] ring-1 ring-orange-100 dark:bg-slate-950/60 dark:text-orange-300 dark:ring-orange-900/50">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>

            <Surface className="rounded-[1.5rem]" variant="base" padding="lg">
              <SectionHeader
                eyebrow={t('identityEyebrow')}
                title={t('identityTitle')}
                description={t('identityDescription')}
                action={<UserRound className="h-5 w-5 text-orange-600 dark:text-orange-300" />}
              />

              <div className="mt-4 space-y-3">
                <TextField
                  label={t('fullName')}
                  leadingIcon={<UserRound className="h-4 w-4 text-slate-400" />}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t('fullNamePlaceholder')}
                  value={name}
                />
                <TextField
                  label={t('phone')}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder={t('phonePlaceholder')}
                  value={phone}
                />
              </div>
            </Surface>
          </div>
        </Surface>

        <Surface className="space-y-4 rounded-[2rem]" variant="base" padding="lg">
          <SectionHeader
            eyebrow={t('addressEyebrow')}
            title={t('addressTitle')}
            description={customerAddress?.urlAddress ? t('addressReady') : t('addressMissing')}
            action={<MapPin className="h-5 w-5 text-orange-600 dark:text-orange-300" />}
          />

          <Surface className="rounded-[1.5rem]" variant="muted" padding="lg">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {customerAddress?.formattedAddress || customerAddress?.urlAddress || t('addressFallback')}
            </p>
          </Surface>

          <Button onClick={handleOpenAddressStep} size="md" variant="outline">
            {customerAddress?.urlAddress ? t('addressAdjust') : t('addressAction')}
          </Button>
        </Surface>

        {error ? (
          <Surface className="rounded-[1.6rem] text-sm text-red-700 dark:text-red-200" variant="raised" padding="lg">
            {error}
          </Surface>
        ) : null}

        <div className="flex flex-col gap-3 pb-4">
          <Button
            disabled={isSaving}
            leadingIcon={<ArrowRight className="h-4 w-4" />}
            onClick={handleContinue}
            size="lg"
          >
            {isSaving ? t('saving') : (customerAddress?.urlAddress ? t('continueHome') : t('continueAddress'))}
          </Button>
          <Button onClick={handleDismiss} size="md" variant="ghost">
            {t('later')}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}