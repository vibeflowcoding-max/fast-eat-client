import { beforeEach, describe, expect, it, vi } from 'vitest';

const maybeSingle = vi.fn();

const from = vi.fn((table: string) => {
  if (table === 'user_profiles') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: null,
            error: { message: 'profile query failed' },
          })),
        })),
      })),
    };
  }

  if (table === 'customers') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: null,
            error: { message: 'customer query failed' },
          })),
        })),
      })),
    };
  }

  if (table === 'customer_address') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle,
        })),
      })),
    };
  }

  throw new Error(`Unexpected table ${table}`);
});

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServer: vi.fn(() => ({
    from,
  })),
}));

describe('getClientBootstrapPayload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'address query failed' } });
  });

  it('returns a safe partial payload when bootstrap queries fail', async () => {
    const { getClientBootstrapPayload } = await import('./me');

    const payload = await getClientBootstrapPayload('user-123');

    expect(payload).toMatchObject({
      authUserId: 'user-123',
      customerId: null,
      profile: {
        userId: 'user-123',
        email: null,
        fullName: null,
        phone: null,
        urlGoogleMaps: null,
      },
      customer: null,
      primaryAddress: null,
      completion: {
        hasProfile: false,
        hasPhone: false,
        hasAddress: false,
      },
    });

    expect(maybeSingle).not.toHaveBeenCalled();
  });
});