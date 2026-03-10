import { beforeEach, describe, expect, it, vi } from 'vitest';

const maybeSingle = vi.fn();
const order = vi.fn(() => ({
  limit: vi.fn(() => ({
    maybeSingle,
  })),
}));

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
          order,
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

  it('uses the latest customer address record when a customer exists', async () => {
    from.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: {
                  user_id: 'user-123',
                  email: 'chef@example.com',
                  full_name: 'Chef',
                  phone: '+50688888888',
                  url_google_maps: null,
                },
                error: null,
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
                data: {
                  id: 'customer-1',
                  auth_user_id: 'user-123',
                  name: 'Chef',
                  phone: '+50688888888',
                  email: 'chef@example.com',
                  address: null,
                },
                error: null,
              })),
            })),
          })),
        };
      }

      if (table === 'customer_address') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order,
            })),
          })),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    maybeSingle.mockResolvedValue({
      data: {
        id: 'address-1',
        customer_id: 'customer-1',
        url_address: 'https://maps.google.com/?q=San+Jose',
        building_type: 'House',
        unit_details: 'Blue gate',
        delivery_notes: 'Call on arrival',
        lat: 9.93,
        lng: -84.08,
        formatted_address: 'San Jose, Costa Rica',
        place_id: 'place-1',
      },
      error: null,
    });

    const { getClientBootstrapPayload } = await import('./me');
    const payload = await getClientBootstrapPayload('user-123');

    expect(order).toHaveBeenCalledWith('updated_at', { ascending: false });
    expect(payload.primaryAddress).toMatchObject({
      id: 'address-1',
      customerId: 'customer-1',
      formattedAddress: 'San Jose, Costa Rica',
      placeId: 'place-1',
    });
  });
});