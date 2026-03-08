import { calculateCheckoutPricing } from './checkout-pricing';

describe('calculateCheckoutPricing', () => {
  it('calculates subtotal, service fee, platform fee and pre-delivery total', () => {
    const result = calculateCheckoutPricing(10000, {
      serviceFeeRate: 0.05,
      platformFeeRate: 0.03,
    });

    expect(result.subtotal).toBe(10000);
    expect(result.serviceFeeAmount).toBe(500);
    expect(result.platformFeeAmount).toBe(300);
    expect(result.totalBeforeDelivery).toBe(10800);
  });

  it('returns subtotal as total when fee rates are zero', () => {
    const result = calculateCheckoutPricing(7250, {
      serviceFeeRate: 0,
      platformFeeRate: 0,
    });

    expect(result.serviceFeeAmount).toBe(0);
    expect(result.platformFeeAmount).toBe(0);
    expect(result.totalBeforeDelivery).toBe(7250);
  });

  it('guards against invalid subtotal and rates', () => {
    const result = calculateCheckoutPricing('invalid', {
      serviceFeeRate: Number.NaN,
      platformFeeRate: -3,
    });

    expect(result.subtotal).toBe(0);
    expect(result.serviceFeeRate).toBe(0);
    expect(result.platformFeeRate).toBe(0);
    expect(result.totalBeforeDelivery).toBe(0);
  });
});
