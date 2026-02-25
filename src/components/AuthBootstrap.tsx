"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useCartStore } from '@/store';

const AUTH_ROUTES = new Set(['/auth/sign-in', '/auth/sign-up', '/auth/callback']);

export default function AuthBootstrap() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    setAuthSession,
    clearAuthSession,
    setAuthHydrated,
    hydrateClientContext,
  } = useCartStore();

  useEffect(() => {
    let isMounted = true;

    async function hydrateAuthenticatedContext(accessToken: string) {
      try {
        await fetch('/api/auth/client/bootstrap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({}),
          cache: 'no-store',
        });

        const contextResponse = await fetch('/api/consumer/me/context', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: 'no-store',
        });

        if (!contextResponse.ok) {
          return;
        }

        const contextData = await contextResponse.json();
        const payload = contextData?.data;

        hydrateClientContext({
          customerName: payload?.profile?.customer?.name ?? payload?.profile?.userProfile?.full_name ?? null,
          customerPhone: payload?.profile?.customer?.phone ?? payload?.profile?.userProfile?.phone ?? null,
          customerAddress: payload?.profile?.primaryAddress
            ? {
                customerId: payload.profile.primaryAddress.customer_id,
                urlAddress: payload.profile.primaryAddress.url_address,
                buildingType: payload.profile.primaryAddress.building_type,
                unitDetails: payload.profile.primaryAddress.unit_details,
                deliveryNotes: payload.profile.primaryAddress.delivery_notes,
              }
            : null,
          favorites: Array.isArray(payload?.favorites) ? payload.favorites : [],
          recentSearches: Array.isArray(payload?.recentSearches) ? payload.recentSearches : [],
          orderHistorySummary: payload?.orderHistorySummary ?? null,
          settings: payload?.settings ?? null,
        });
      } catch {
        // Fail silently in bootstrap so app can continue rendering.
      }
    }

    async function initialize() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!isMounted) {
        return;
      }

      if (session?.user?.id && session.access_token) {
        setAuthSession({
          userId: session.user.id,
          email: session.user.email ?? null,
        });

        await hydrateAuthenticatedContext(session.access_token);

        if (AUTH_ROUTES.has(pathname)) {
          router.replace('/');
        }
      } else {
        clearAuthSession();

        if (!AUTH_ROUTES.has(pathname)) {
          const nextParam = encodeURIComponent(pathname || '/');
          router.replace(`/auth/sign-in?next=${nextParam}`);
        }
      }

      setAuthHydrated(true);
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) {
        return;
      }

      if (session?.user?.id && session.access_token) {
        setAuthSession({
          userId: session.user.id,
          email: session.user.email ?? null,
        });

        await hydrateAuthenticatedContext(session.access_token);

        if (AUTH_ROUTES.has(pathname)) {
          router.replace('/');
        }
      } else {
        clearAuthSession();
        if (!AUTH_ROUTES.has(pathname)) {
          const nextParam = encodeURIComponent(pathname || '/');
          router.replace(`/auth/sign-in?next=${nextParam}`);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router, setAuthSession, clearAuthSession, setAuthHydrated, hydrateClientContext]);

  return null;
}
