import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
  })),
}));

import { POST } from './route';

describe('orders route validation', () => {
  it('rejects unsupported order payloads', async () => {
    const response = await POST(new NextRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ success: false, message: 'Invalid order payload' }),
    );
  });
});