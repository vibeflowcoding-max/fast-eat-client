"use client";

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { NavigateOptions } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { startRouteLoading } from '@/lib/route-loading';

export function useAppRouter() {
  const router = useRouter();

  const push = useCallback((href: string, options?: NavigateOptions) => {
    startRouteLoading();
    router.push(href, options);
  }, [router]);

  const replace = useCallback((href: string, options?: NavigateOptions) => {
    startRouteLoading();
    router.replace(href, options);
  }, [router]);

  const back = useCallback(() => {
    startRouteLoading();
    router.back();
  }, [router]);

  const forward = useCallback(() => {
    startRouteLoading();
    router.forward();
  }, [router]);

  const refresh = useCallback(() => {
    startRouteLoading();
    router.refresh();
  }, [router]);

  return {
    push,
    replace,
    back,
    forward,
    refresh,
    prefetch: router.prefetch
  };
}
