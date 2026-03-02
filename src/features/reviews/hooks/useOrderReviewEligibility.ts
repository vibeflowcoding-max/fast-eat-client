import React from 'react';
import type { ReviewEligibility } from '@/features/reviews/types';

type UseOrderReviewEligibilityArgs = {
  orderId?: string | null;
  customerId?: string | null;
  enabled?: boolean;
};

export function useOrderReviewEligibility({
  orderId,
  customerId,
  enabled = true
}: UseOrderReviewEligibilityArgs) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<ReviewEligibility | null>(null);

  const refresh = React.useCallback(async () => {
    if (!enabled || !orderId || !customerId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/reviews/eligibility?orderId=${encodeURIComponent(orderId)}&customerId=${encodeURIComponent(customerId)}`
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not load review eligibility');
      }

      setData(payload as ReviewEligibility);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load review eligibility');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [customerId, enabled, orderId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    loading,
    error,
    eligibility: data,
    refresh
  };
}
