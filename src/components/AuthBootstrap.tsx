"use client";

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isPublicAnonymousPath } from '@/lib/public-routes';
import { fetchClientBootstrap } from '@/services/api';
import { useCartStore } from '@/store';
import { normalizePhoneWithSinglePlus } from '@/lib/phone';
import { extractGoogleMapsUrl, parseCoordsFromGoogleMapsUrl } from '@/lib/location';
import type { ReadonlyURLSearchParams } from 'next/navigation';

const AUTH_ROUTES = new Set(['/auth/sign-in', '/auth/sign-up', '/auth/callback']);

function resolvePostAuthRedirect(pathname: string, searchParams: URLSearchParams | ReadonlyURLSearchParams | null) {
  if (!AUTH_ROUTES.has(pathname)) {
    return null;
  }

  const nextValue = searchParams?.get('next') || '/';
  return nextValue.startsWith('/') ? nextValue : '/';
}

export default function AuthBootstrap() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const pathnameRef = useRef(pathname);
  const searchParamsRef = useRef<URLSearchParams | ReadonlyURLSearchParams | null>(searchParams);
  const replaceRef = useRef(router.replace);

  useEffect(() => {
    pathnameRef.current = pathname;
    searchParamsRef.current = searchParams;
  }, [pathname, searchParams]);

  useEffect(() => {
    replaceRef.current = router.replace;
  }, [router]);

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

    async function handleUnauthenticatedSession() {
      clearAuthSession();
      lastHydratedTokenRef.current = null;

      const currentPathname = pathnameRef.current;

      if (!AUTH_ROUTES.has(currentPathname) && !isPublicAnonymousPath(currentPathname)) {
        const nextParam = encodeURIComponent(currentPathname || '/');
        replaceRef.current(`/auth/sign-in?next=${nextParam}`);
      }
    }

    async function initialize() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const redirectPath = resolvePostAuthRedirect(pathnameRef.current, searchParamsRef.current);

      if (!isMounted) {
        return;
      }

      if (session?.user?.id && session.access_token) {
        setAuthSession({
          userId: session.user.id,
          email: session.user.email ?? null,
        });

        setAuthHydrated(true);

        if (redirectPath) {
          replaceRef.current(redirectPath);
        }

        void hydrateAuthenticatedContext(session.access_token);
      } else {
        await handleUnauthenticatedSession();
      }

      setAuthHydrated(true);
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, [setAuthSession, clearAuthSession, setAuthHydrated, hydrateClientContext, setSavedCarts, setSavedCartsError, setSavedCartsHydrated]);

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
        setSavedCartsHydrated(true);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const redirectPath = resolvePostAuthRedirect(pathnameRef.current, searchParamsRef.current);

      if (!isMounted) {
        return;
      }

      if (session?.user?.id && session.access_token) {
        setAuthSession({
          userId: session.user.id,
          email: session.user.email ?? null,
        });

        setAuthHydrated(true);

        if (redirectPath) {
          replaceRef.current(redirectPath);
        }

        void hydrateAuthenticatedContext(session.access_token);
      } else {
        clearAuthSession();
        lastHydratedTokenRef.current = null;
        const currentPathname = pathnameRef.current;

        if (!AUTH_ROUTES.has(currentPathname) && !isPublicAnonymousPath(currentPathname)) {
          const nextParam = encodeURIComponent(currentPathname || '/');
          replaceRef.current(`/auth/sign-in?next=${nextParam}`);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setAuthSession, clearAuthSession, setAuthHydrated, hydrateClientContext, setSavedCarts, setSavedCartsError, setSavedCartsHydrated]);

  return null;
}
