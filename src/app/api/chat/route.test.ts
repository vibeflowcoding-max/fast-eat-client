import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

describe('chat route validation', () => {
  it('rejects malformed request bodies', async () => {
    const response = await POST(new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ branch_id: '' }),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(400);
  });
});