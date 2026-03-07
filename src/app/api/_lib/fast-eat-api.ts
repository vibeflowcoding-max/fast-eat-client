export function getFastEatApiBaseUrl(): string {
  const rawUrl = process.env.FAST_EAT_API_URL;
  const normalizedUrl = typeof rawUrl === 'string' ? rawUrl.trim().replace(/\/$/, '') : '';

  if (!normalizedUrl) {
    throw new Error('Missing FAST_EAT_API_URL configuration');
  }

  return normalizedUrl;
}

export function buildFastEatApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getFastEatApiBaseUrl()}${normalizedPath}`;
}