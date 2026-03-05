"use client";

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useCartStore } from '@/store';
import { normalizePhoneWithSinglePlus } from '@/lib/phone';
import { extractGoogleMapsUrl, parseCoordsFromGoogleMapsUrl } from '@/lib/location';

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
  const lastHydratedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

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
      if (lastHydratedTokenRef.current === accessToken) {
        return;
      }

      try {
        const [profileResponse, contextResponse] = await Promise.all([
          fetchWithTimeout('/api/profile/me', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            cache: 'no-store',
          }),
          fetchWithTimeout('/api/consumer/me/context', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            cache: 'no-store',
          }, 10000),
        ]);

        let profilePayload: {
          fullName?: string | null;
          phone?: string | null;
          urlGoogleMaps?: string | null;
        } | null = null;

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          profilePayload = profileData?.profile ?? null;
        }

        if (!contextResponse.ok) {
          const canonicalName =
            typeof profilePayload?.fullName === 'string' && profilePayload.fullName.trim()
              ? profilePayload.fullName.trim()
              : null;
          const canonicalPhone = normalizePhoneWithSinglePlus(profilePayload?.phone ?? null);
          const canonicalUrlGoogleMaps = extractGoogleMapsUrl(profilePayload?.urlGoogleMaps) || null;
          const profileCoords = canonicalUrlGoogleMaps ? parseCoordsFromGoogleMapsUrl(canonicalUrlGoogleMaps) : {};

          hydrateClientContext({
            customerName: canonicalName,
            customerPhone: canonicalPhone,
            customerAddress: canonicalUrlGoogleMaps
              ? {
                  urlAddress: canonicalUrlGoogleMaps,
                  buildingType: 'Other',
                  deliveryNotes: 'Meet at door',
                  lat: profileCoords.lat,
                  lng: profileCoords.lng,
                  formattedAddress: canonicalUrlGoogleMaps,
                }
              : null,
          });

          lastHydratedTokenRef.current = accessToken;
          return;
        }

        const contextData = await contextResponse.json();
        const payload = contextData?.data;

        const contextProfileName =
          typeof payload?.profile?.userProfile?.full_name === 'string' && payload.profile.userProfile.full_name.trim()
            ? payload.profile.userProfile.full_name.trim()
            : null;
        const contextProfilePhone = normalizePhoneWithSinglePlus(payload?.profile?.userProfile?.phone ?? null);
        const contextProfileMaps = extractGoogleMapsUrl(payload?.profile?.userProfile?.url_google_maps) || null;

        const canonicalName =
          typeof profilePayload?.fullName === 'string' && profilePayload.fullName.trim()
            ? profilePayload.fullName.trim()
            : contextProfileName;
        const canonicalPhone = normalizePhoneWithSinglePlus(profilePayload?.phone ?? contextProfilePhone ?? null);
        const canonicalUrlGoogleMaps =
          extractGoogleMapsUrl(profilePayload?.urlGoogleMaps)
          || contextProfileMaps
          || null;
        const profileCoords = canonicalUrlGoogleMaps ? parseCoordsFromGoogleMapsUrl(canonicalUrlGoogleMaps) : {};

        hydrateClientContext({
          customerId: payload?.profile?.customer?.id ?? null,
          customerName: canonicalName,
          customerPhone: canonicalPhone,
          customerAddress: canonicalUrlGoogleMaps
            ? {
                customerId: payload?.profile?.customer?.id ?? undefined,
                urlAddress: canonicalUrlGoogleMaps,
                buildingType: 'Other',
                unitDetails: undefined,
                deliveryNotes: 'Meet at door',
                lat: profileCoords.lat,
                lng: profileCoords.lng,
                formattedAddress: canonicalUrlGoogleMaps,
              }
            : null,
          favorites: Array.isArray(payload?.favorites) ? payload.favorites : [],
          recentSearches: Array.isArray(payload?.recentSearches) ? payload.recentSearches : [],
          orderHistorySummary: payload?.orderHistorySummary ?? null,
          settings: payload?.settings ?? null,
        });
        lastHydratedTokenRef.current = accessToken;
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
        lastHydratedTokenRef.current = null;

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
        lastHydratedTokenRef.current = null;
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
