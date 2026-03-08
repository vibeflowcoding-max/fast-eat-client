import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../_lib', () => ({
  getTraceId: vi.fn(() => 'trace-test'),
}));

describe('predictive reorder route', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns a 400 fallback when the request body is invalid JSON', async () => {
    const { POST } = await import('./route');

    const request = {
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected end of JSON input')),
      headers: {
        get: vi.fn(() => null),
      },
    } as any;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      should_prompt: false,
      confidence: 0,
      status: 'incomplete_data',
      reason: 'request_body_invalid',
      source: 'client',
      traceId: 'trace-test',
    });
  });
});