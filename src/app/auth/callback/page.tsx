"use client";

import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell, FieldMessage, Icon, Surface } from '@/../resources/components';
import { DEFAULT_POST_AUTH_PATH } from '@/lib/auth-redirect';
import { supabase } from '@/lib/supabase';
import { useTranslations } from 'next-intl';

export const dynamic = 'force-dynamic';

function AuthCallbackContent() {
  const router = useRouter();
  const t = useTranslations('auth.callback');
  const tCommon = useTranslations('auth.common');
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveCallback() {
      try {
        const code = searchParams.get('code');

        if (!code) {
          throw new Error(t('missingCode'));
        }

        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          throw exchangeError;
        }

        const accessToken = data.session?.access_token;

        if (accessToken) {
          await fetch('/api/auth/client/bootstrap', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({}),
          });
        }

        if (!cancelled) {
          router.replace(DEFAULT_POST_AUTH_PATH);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('genericError'));
        }
      }
    }

    resolveCallback();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams, t]);

  return (
    <AuthShell
      brand="FastEat"
      description={t('loading')}
      heroDescription={t('heroDescription')}
      heroFooterText={tCommon('heroFooter')}
      heroTitle={t('heroTitle')}
      title={t('title')}
    >
      <Surface className="space-y-4 text-center" variant="base">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
          <Icon symbol={error ? 'error' : 'progress_activity'} tone={error ? 'danger' : 'brand'} />
        </div>
        {error ? <FieldMessage tone="error">{error}</FieldMessage> : <p className="text-sm text-slate-500 dark:text-slate-400">{t('loading')}</p>}
      </Surface>
    </AuthShell>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackContent />
    </Suspense>
  );
}
