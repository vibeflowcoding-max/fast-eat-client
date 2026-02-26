import React from 'react';

type SubmitDeliveryReviewInput = {
  orderId: string;
  phone: string;
  rating: number;
  comment?: string;
  driverId?: string;
  deliveryBidId?: string;
};

export function useSubmitDeliveryReview() {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = React.useCallback(async (input: SubmitDeliveryReviewInput) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/reviews/delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not submit delivery review');
      }

      return payload;
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Could not submit delivery review';
      setError(message);
      throw requestError;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return {
    submitting,
    error,
    submit
  };
}
