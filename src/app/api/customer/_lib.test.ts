import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findCustomerIdByPhone, findCustomerByPhone } from './_lib';
import { getSupabaseServer } from '@/lib/supabase-server';

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServer: vi.fn(),
}));

describe('Customer discovery performance benchmark', () => {
  let mockSupabase: any;
  let callCount = 0;

  beforeEach(() => {
    callCount = 0;
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockImplementation(() => {
        callCount++;
        return {
          or: vi.fn().mockReturnThis(),
          limit: vi.fn().mockImplementation(() => Promise.resolve({ data: [], error: null })),
        };
      }),
    };
    (getSupabaseServer as any).mockReturnValue(mockSupabase);
  });

  it('findCustomerIdByPhone makes a single optimized query', async () => {
    await findCustomerIdByPhone('12345678');
    // Now it should make only 1 call using .or()
    expect(callCount).toBe(1);
  });

  it('findCustomerByPhone makes a single optimized query', async () => {
    await findCustomerByPhone('12345678');
    expect(callCount).toBe(1);
  });
});
