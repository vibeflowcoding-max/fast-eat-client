vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
    },
  },
}));

import { hasStructuredMenuCustomization } from './api';

describe('hasStructuredMenuCustomization', () => {
  it('treats multi-variant items as structured customization', () => {
    expect(
      hasStructuredMenuCustomization({
        variants: [
          { id: 'v1', name: 'Regular', price: 5000 },
          { id: 'v2', name: 'Grande', price: 6200 },
        ],
      }),
    ).toBe(true);
  });

  it('does not force single-variant items into the detail modal without other customization data', () => {
    expect(
      hasStructuredMenuCustomization({
        variants: [{ id: 'v1', name: 'Regular', price: 5000 }],
      }),
    ).toBe(false);
  });

  it('keeps modifier-driven items structured even without multiple variants', () => {
    expect(
      hasStructuredMenuCustomization({
        modifier_groups: [{ id: 'group-1' }],
        variants: [{ id: 'v1', name: 'Regular', price: 5000 }],
      }),
    ).toBe(true);
  });
});