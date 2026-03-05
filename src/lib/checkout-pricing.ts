export interface CheckoutFeeRates {
  serviceFeeRate: number;
  platformFeeRate: number;
}

export interface CheckoutPricingBreakdown {
  subtotal: number;
  serviceFeeRate: number;
  platformFeeRate: number;
  serviceFeeAmount: number;
  platformFeeAmount: number;
  totalBeforeDelivery: number;
}

function normalizeRate(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }

  return numeric;
}

function normalizeAmount(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }

  return numeric;
}

export function calculateCheckoutPricing(subtotalInput: unknown, ratesInput: Partial<CheckoutFeeRates>): CheckoutPricingBreakdown {
  const subtotal = Math.round(normalizeAmount(subtotalInput));
  const serviceFeeRate = normalizeRate(ratesInput.serviceFeeRate);
  const platformFeeRate = normalizeRate(ratesInput.platformFeeRate);

  const serviceFeeAmount = Math.round(subtotal * serviceFeeRate);
  const platformFeeAmount = Math.round(subtotal * platformFeeRate);
  const totalBeforeDelivery = subtotal + serviceFeeAmount + platformFeeAmount;

  return {
    subtotal,
    serviceFeeRate,
    platformFeeRate,
    serviceFeeAmount,
    platformFeeAmount,
    totalBeforeDelivery,
  };
}
