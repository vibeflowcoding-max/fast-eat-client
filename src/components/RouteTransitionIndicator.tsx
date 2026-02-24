"use client";

import React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { subscribeRouteLoading, stopRouteLoading } from '@/lib/route-loading';

export default function RouteTransitionIndicator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = subscribeRouteLoading(setIsLoading);
    return unsubscribe;
  }, []);

  React.useEffect(() => {
    stopRouteLoading();
  }, [pathname, searchParams]);

  React.useEffect(() => {
    if (!isLoading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      stopRouteLoading();
    }, 12000);

    return () => window.clearTimeout(timeoutId);
  }, [isLoading]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed left-0 right-0 top-0 z-[300] h-1 overflow-hidden bg-transparent transition-opacity duration-150 ${
        isLoading ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="h-full w-1/3 bg-gradient-to-r from-orange-500 via-amber-400 to-red-500 animate-route-loading" />
    </div>
  );
}
