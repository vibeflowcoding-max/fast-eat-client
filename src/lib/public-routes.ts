const PROTECTED_ROOT_SEGMENTS = new Set([
  'address',
  'api',
  'auth',
  'carts',
  'checkout',
  'open-location',
  'onboarding',
  'orders',
  'profile',
  'reviews',
  'ui-preview',
]);

function normalizePathname(pathname: string): string {
  const sanitizedPath = pathname.split('?')[0]?.split('#')[0] ?? '/';

  if (!sanitizedPath || sanitizedPath === '/') {
    return '/';
  }

  return sanitizedPath.endsWith('/') ? sanitizedPath.slice(0, -1) : sanitizedPath;
}

export function isPublicAnonymousPath(pathname: string | null | undefined): boolean {
  const normalizedPath = normalizePathname(pathname ?? '/');

  if (normalizedPath === '/' || normalizedPath === '/search') {
    return true;
  }

  if (/^\/group\/[^/]+$/.test(normalizedPath)) {
    return true;
  }

  const segments = normalizedPath.split('/').filter(Boolean);

  if (segments.length !== 1) {
    return false;
  }

  return !PROTECTED_ROOT_SEGMENTS.has(segments[0]);
}