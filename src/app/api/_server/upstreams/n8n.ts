function resolveN8nUrl(requestedTestMode: boolean): string {
  const allowTestUpstream = requestedTestMode && process.env.NODE_ENV !== 'production';
  const baseUrl = allowTestUpstream
    ? process.env.N8N_TEST_BASE_URL?.trim() || process.env.N8N_BASE_URL?.trim()
    : process.env.N8N_BASE_URL?.trim();
  const webhookId = process.env.N8N_WEBHOOK_ID?.trim();

  if (!baseUrl || !webhookId) {
    throw new Error('N8N webhook configuration is incomplete');
  }

  return `${baseUrl.replace(/\/$/, '')}/${webhookId}`;
}

async function parseJsonSafely(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.toLowerCase().includes('application/json')) {
    const text = await response.text().catch(() => '');
    return text ? { message: text } : null;
  }

  return response.json().catch(() => null);
}

export async function postN8nWebhook(body: unknown, requestedTestMode = false, timeoutMs = 55000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(resolveN8nUrl(requestedTestMode), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });

    const payload = await parseJsonSafely(response);
    return { response, payload };
  } finally {
    clearTimeout(timeoutId);
  }
}