function getFastEatApiUrl(): string {
  const apiUrl = process.env.FAST_EAT_API_URL?.trim();

  if (!apiUrl) {
    throw new Error('FAST_EAT_API_URL is not configured');
  }

  return apiUrl.replace(/\/$/, '');
}

async function parseJsonSafely(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.toLowerCase().includes('application/json')) {
    const text = await response.text().catch(() => '');
    return text ? { message: text } : null;
  }

  return response.json().catch(() => null);
}

export async function fetchFastEat(path: string, init: RequestInit = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getFastEatApiUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      cache: init.cache ?? 'no-store',
    });

    const payload = await parseJsonSafely(response);
    return { response, payload };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getSafeUpstreamErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const errorPayload = payload as { error?: unknown; message?: unknown };
  if (typeof errorPayload.message === 'string' && errorPayload.message.trim()) {
    return errorPayload.message;
  }

  if (typeof errorPayload.error === 'string' && errorPayload.error.trim()) {
    return errorPayload.error;
  }

  return fallback;
}