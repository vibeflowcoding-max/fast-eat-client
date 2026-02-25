"use client";

import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveCallback() {
      try {
        const code = searchParams.get('code');
        const nextValue = searchParams.get('next') || '/';
        const nextPath = nextValue.startsWith('/') ? nextValue : '/';

        if (!code) {
          throw new Error('No se recibió código OAuth');
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
          router.replace(nextPath);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudo completar la autenticación');
        }
      }
    }

    resolveCallback();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Finalizando autenticación...</h1>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : <p className="mt-3 text-sm text-neutral-600">Un momento, te estamos ingresando.</p>}
      </section>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackContent />
    </Suspense>
  );
}
