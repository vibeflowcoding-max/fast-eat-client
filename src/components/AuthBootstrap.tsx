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

    function parseCoordsFromGoogleMapsUrl(url: string): { lat?: number; lng?: number } {
      const match = url.match(/q=([-\d.]+),([-\d.]+)/i);
      if (!match) {
        return {};
      }

      const lat = Number(match[1]);
      const lng = Number(match[2]);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return {};
      }

      return { lat, lng };
    }

    function extractGoogleMapsUrl(input: string): string | null {
      const found = input.match(/https:\/\/www\.google\.com\/maps\?q=[^\s]+/i);
      return found?.[0] ?? null;
    }

    async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs: number = 10000) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

      try {
        return await fetch(input, {
          ...init,
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    async function hydrateAuthenticatedContext(accessToken: string) {
      try {
        void fetchWithTimeout('/api/auth/client/bootstrap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({}),
          cache: 'no-store',
        }).catch(() => undefined);

        const contextResponse = await fetchWithTimeout('/api/consumer/me/context', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: 'no-store',
        }, 10000);

        if (!contextResponse.ok) {
          return;
        }

        const contextData = await contextResponse.json();
        const payload = contextData?.data;
        const customerAddressRaw =
          typeof payload?.profile?.customer?.address === 'string'
            ? payload.profile.customer.address.trim()
            : '';
        const customerMapsUrl = customerAddressRaw ? extractGoogleMapsUrl(customerAddressRaw) : null;
        const customerCoords = customerMapsUrl ? parseCoordsFromGoogleMapsUrl(customerMapsUrl) : {};

        hydrateClientContext({
          customerId: payload?.profile?.customer?.id ?? null,
          customerName: payload?.profile?.customer?.name ?? payload?.profile?.userProfile?.full_name ?? null,
          customerPhone: payload?.profile?.customer?.phone ?? payload?.profile?.userProfile?.phone ?? null,
          customerAddress: payload?.profile?.primaryAddress
            ? {
                customerId: payload.profile.primaryAddress.customer_id,
                urlAddress: payload.profile.primaryAddress.url_address,
                buildingType: payload.profile.primaryAddress.building_type,
                unitDetails: payload.profile.primaryAddress.unit_details,
                deliveryNotes: payload.profile.primaryAddress.delivery_notes,
                lat: typeof payload.profile.primaryAddress.lat === 'number' ? payload.profile.primaryAddress.lat : undefined,
                lng: typeof payload.profile.primaryAddress.lng === 'number' ? payload.profile.primaryAddress.lng : undefined,
                formattedAddress:
                  typeof payload.profile.primaryAddress.formatted_address === 'string'
                    ? payload.profile.primaryAddress.formatted_address
                    : undefined,
                placeId:
                  typeof payload.profile.primaryAddress.place_id === 'string'
                    ? payload.profile.primaryAddress.place_id
                    : undefined,
              }
            : customerMapsUrl || customerAddressRaw
              ? {
                  customerId: payload?.profile?.customer?.id ?? undefined,
                  urlAddress: customerMapsUrl ?? customerAddressRaw,
                  buildingType: 'Other',
                  unitDetails: undefined,
                  deliveryNotes: 'Meet at door',
                  lat: customerCoords.lat,
                  lng: customerCoords.lng,
                  formattedAddress: customerAddressRaw,
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
