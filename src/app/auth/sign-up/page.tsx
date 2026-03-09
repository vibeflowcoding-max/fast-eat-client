"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { AuthShell, Button, FieldMessage, Icon, SocialAuthButton, TextField } from '@/../resources/components';
import { supabase } from '@/lib/supabase';
import { useTranslations } from 'next-intl';

const COSTA_RICA_PHONE_PREFIX = '+506';
const COSTA_RICA_PHONE_REGEX = /^\+506\d{8}$/;

function normalizeCostaRicaLocalPhoneInput(rawValue: string): string {
  return rawValue.replace(/\D/g, '').slice(0, 8);
}

export default function SignUpPage() {
  const router = useRouter();
  const t = useTranslations('auth.signUp');
  const tCommon = useTranslations('auth.common');
  const [fullName, setFullName] = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const phone = `${COSTA_RICA_PHONE_PREFIX}${localPhone}`;

    if (!COSTA_RICA_PHONE_REGEX.test(phone)) {
      setLoading(false);
      setError(t('phoneError'));
      return;
    }

    try {
      const response = await fetch('/api/auth/client/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || data?.error || t('genericError'));
      }

      if (data?.session?.accessToken && data?.session?.refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.accessToken,
          refresh_token: data.session.refreshToken,
        });

        if (sessionError) {
          throw sessionError;
        }

        router.replace('/');
        return;
      }

      setMessage(data?.message || t('successFallback'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('genericError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/')}`,
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('genericError'));
      setLoading(false);
    }
  };

  return (
    <AuthShell
      brand="FastEat"
      description={t('description')}
      footer={(
        <>
          {t('hasAccount')}{' '}
          <Link href="/auth/sign-in" className="font-semibold text-orange-600 underline-offset-4 hover:underline dark:text-orange-300">
            {t('signInLink')}
          </Link>
        </>
      )}
      heroDescription={t('heroDescription')}
      heroFooterText={tCommon('heroFooter')}
      heroTitle={t('heroTitle')}
      title={t('title')}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <TextField
          autoComplete="name"
          id="fullName"
          label={t('fullName')}
          leadingIcon={<Icon symbol="person" tone="muted" />}
          onChange={(event) => setFullName(event.target.value)}
          placeholder={t('fullNamePlaceholder')}
          required
          requiredLabel={tCommon('requiredBadge')}
          value={fullName}
        />

        <label className="flex w-full flex-col gap-2">
          <span className="px-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{t('phone')}</span>
          <span className="flex min-h-14 items-center rounded-2xl border border-slate-200 bg-white px-4 ring-1 ring-transparent transition-colors focus-within:border-orange-500 focus-within:ring-orange-200 dark:border-slate-700 dark:bg-slate-900/80">
            <span className="mr-3 inline-flex items-center border-r border-slate-200 pr-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
              {COSTA_RICA_PHONE_PREFIX}
            </span>
            <input
              id="phone"
              className="w-full border-0 bg-transparent p-0 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0 dark:text-slate-100"
              inputMode="numeric"
              maxLength={8}
              onChange={(event) => setLocalPhone(normalizeCostaRicaLocalPhoneInput(event.target.value))}
              pattern="^\d{8}$"
              placeholder={t('phonePlaceholder')}
              required
              title={t('phoneTitle')}
              type="tel"
              value={localPhone}
            />
          </span>
        </label>

        <TextField
          autoComplete="email"
          id="email"
          label={t('email')}
          leadingIcon={<Icon symbol="mail" tone="muted" />}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('emailPlaceholder')}
          required
          requiredLabel={tCommon('requiredBadge')}
          type="email"
          value={email}
        />

        <TextField
          autoComplete="new-password"
          id="password"
          label={t('password')}
          leadingIcon={<Icon symbol="lock" tone="muted" />}
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t('passwordPlaceholder')}
          required
          requiredLabel={tCommon('requiredBadge')}
          trailingAction={(
            <button
              aria-label={showPassword ? t('hidePassword') : t('showPassword')}
              className="text-slate-400 transition-colors hover:text-orange-600 dark:hover:text-orange-300"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              <Icon symbol={showPassword ? 'visibility_off' : 'visibility'} tone="muted" />
            </button>
          )}
          type={showPassword ? 'text' : 'password'}
          value={password}
        />

        {error ? <FieldMessage tone="error">{error}</FieldMessage> : null}
        {message ? <FieldMessage tone="success">{message}</FieldMessage> : null}

        <Button disabled={loading} fullWidth size="lg" type="submit">
          {loading ? t('submitting') : t('submit')}
        </Button>
      </form>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:bg-slate-950">{t('socialDivider')}</span>
        </div>
      </div>

      <SocialAuthButton
        disabled={loading}
        icon={(
          <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        onClick={handleGoogleSignIn}
        type="button"
      >
        {t('google')}
      </SocialAuthButton>
    </AuthShell>
  );
}
