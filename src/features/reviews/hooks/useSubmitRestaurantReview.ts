import React from 'react';

type SubmitRestaurantReviewInput = {
  orderId: string;
  phone: string;
  branchId: string;
  rating: number;
  comment?: string;
};

export function useSubmitRestaurantReview() {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = React.useCallback(async (input: SubmitRestaurantReviewInput) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/reviews/restaurant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not submit restaurant review');
      }

      return payload;
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Could not submit restaurant review';
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
