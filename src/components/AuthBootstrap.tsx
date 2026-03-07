"use client";

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isPublicAnonymousPath } from '@/lib/public-routes';
import { fetchClientBootstrap } from '@/services/api';
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
    setSavedCarts,
    setSavedCartsHydrated,
    setSavedCartsError,
  } = useCartStore();
  const lastHydratedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrateAuthenticatedContext(accessToken: string) {
      if (lastHydratedTokenRef.current === accessToken) {
        return;
      }

      try {
        setSavedCarts([]);
        setSavedCartsError(null);
        setSavedCartsHydrated(true);

        const payload = await fetchClientBootstrap();
        const canonicalName =
          typeof payload?.profile?.fullName === 'string' && payload.profile.fullName.trim()
            ? payload.profile.fullName.trim()
            : typeof payload?.customer?.name === 'string' && payload.customer.name.trim()
              ? payload.customer.name.trim()
              : null;
        const canonicalPhone = normalizePhoneWithSinglePlus(
          payload?.profile?.phone ?? payload?.customer?.phone ?? null,
        );
        const canonicalUrlGoogleMaps = extractGoogleMapsUrl(
          payload?.primaryAddress?.urlAddress
            || payload?.primaryAddress?.formattedAddress
            || payload?.profile?.urlGoogleMaps
            || null,
        );
        const profileCoords = canonicalUrlGoogleMaps ? parseCoordsFromGoogleMapsUrl(canonicalUrlGoogleMaps) : {};

        hydrateClientContext({
          customerId: payload?.customerId ?? payload?.customer?.id ?? null,
          customerName: canonicalName,
          customerPhone: canonicalPhone,
          customerAddress: canonicalUrlGoogleMaps
            ? {
                customerId: payload?.primaryAddress?.customerId ?? payload?.customer?.id ?? undefined,
                urlAddress: canonicalUrlGoogleMaps,
                buildingType: payload?.primaryAddress?.buildingType === 'Apartment'
                  || payload?.primaryAddress?.buildingType === 'Residential Building'
                  || payload?.primaryAddress?.buildingType === 'Hotel'
                  || payload?.primaryAddress?.buildingType === 'Office Building'
                  ? payload.primaryAddress.buildingType
                  : 'Other',
                unitDetails: payload?.primaryAddress?.unitDetails ?? undefined,
                deliveryNotes: payload?.primaryAddress?.deliveryNotes || 'Meet at door',
                lat: typeof payload?.primaryAddress?.lat === 'number' ? payload.primaryAddress.lat : profileCoords.lat,
                lng: typeof payload?.primaryAddress?.lng === 'number' ? payload.primaryAddress.lng : profileCoords.lng,
                formattedAddress: payload?.primaryAddress?.formattedAddress || canonicalUrlGoogleMaps,
                placeId: payload?.primaryAddress?.placeId ?? undefined,
              }
            : null,
        });

        lastHydratedTokenRef.current = accessToken;
      } catch {
        // Fail silently in bootstrap so app can continue rendering.
        setSavedCartsHydrated(true);
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

        if (!AUTH_ROUTES.has(pathname) && !isPublicAnonymousPath(pathname)) {
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
        if (!AUTH_ROUTES.has(pathname) && !isPublicAnonymousPath(pathname)) {
          const nextParam = encodeURIComponent(pathname || '/');
          router.replace(`/auth/sign-in?next=${nextParam}`);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router, setAuthSession, clearAuthSession, setAuthHydrated, hydrateClientContext, setSavedCarts, setSavedCartsError, setSavedCartsHydrated]);

  return null;
}
