import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

describe('external route', () => {
  it('returns 410 for deprecated GET usage', async () => {
    const response = await GET(new NextRequest('http://localhost/api/external'));

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ error: expect.stringContaining('deprecated') }),
    );
  });

  it('returns 410 for deprecated POST usage', async () => {
    const response = await POST(new NextRequest('http://localhost/api/external', { method: 'POST' }));

    expect(response.status).toBe(410);
  });
});