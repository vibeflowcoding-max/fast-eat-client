const AUTH_ROUTES = new Set(['/auth/sign-in', '/auth/sign-up', '/auth/callback']);

export const DEFAULT_POST_AUTH_PATH = '/';

export function resolvePostAuthRedirect(pathname: string) {
  if (!AUTH_ROUTES.has(pathname)) {
    return null;
  }

  return DEFAULT_POST_AUTH_PATH;
}

export function buildAuthCallbackUrl(origin: string) {
  return `${origin}/auth/callback`;
}