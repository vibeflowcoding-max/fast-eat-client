import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findCustomerIdByPhone, findCustomerByPhone } from './_lib';
import { getSupabaseServer } from '@/lib/supabase-server';

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServer: vi.fn(),
}));

describe('Customer discovery performance benchmark and query correctness', () => {
  let mockSupabase: any;
  let lastOrCondition = '';
  let lastSelectColumns = '';

  beforeEach(() => {
    lastOrCondition = '';
    lastSelectColumns = '';
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockImplementation((columns) => {
        lastSelectColumns = columns;
        return {
          or: vi.fn().mockImplementation((condition) => {
            lastOrCondition = condition;
            // The limit() call was removed from the implementation,
            // so the mock needs to return the promise directly from or()
            // to maintain compatibility with existing test expectations
            // and verify that limit is NOT called.
            return Promise.resolve({ data: [], error: null });
          }),
        };
      }),
    };
    (getSupabaseServer as any).mockReturnValue(mockSupabase);
  });

  it('findCustomerIdByPhone makes a single optimized query with correct columns and escaping', async () => {
    // A phone number with a double quote to test escaping
    const specialPhone = '123"456';
    await findCustomerIdByPhone(specialPhone);

    // Verify select columns
    expect(lastSelectColumns).toBe('id,phone,phone_number,from_number,customer_phone');

    // Verify or condition escaping
    // buildPhoneCandidates('123"456') should include '123"456' and '123456'
    // sanitizePostgrestValue('123"456') -> '"123""456"'
    // sanitizePostgrestValue('123456') -> '"123456"'
    expect(lastOrCondition).toContain('phone.eq."123""456"');
    expect(lastOrCondition).toContain('phone.eq."123456"');
    expect(lastOrCondition).toContain('phone_number.eq."123""456"');
  });

  it('findCustomerByPhone selects all columns', async () => {
    await findCustomerByPhone('12345678');
    expect(lastSelectColumns).toBe('*');
  });

  it('both functions make only one database call', async () => {
    let callCount = 0;
    mockSupabase.from = vi.fn().mockImplementation(() => {
      callCount++;
      return {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    await findCustomerIdByPhone('12345678');
    expect(callCount).toBe(1);

    callCount = 0;
    await findCustomerByPhone('12345678');
    expect(callCount).toBe(1);
  });

  it('correctly picks the customer from multiple returned rows based on column priority', async () => {
    const phone = '12345678';
    mockSupabase.from = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockImplementation(() => ({
        or: vi.fn().mockResolvedValue({
          data: [
            { id: 'wrong-match', phone: '00000000', customer_phone: phone }, // Match in lower priority column
            { id: 'right-match', phone: phone }, // Match in higher priority column
          ],
          error: null,
        }),
      })),
    }));

    const result = await findCustomerByPhone(phone);
    // Even though 'wrong-match' is first in the array, 'right-match' should be picked
    // because it matches on the 'phone' column which is checked first in the loop.
    expect(result?.id).toBe('right-match');
  });
});
