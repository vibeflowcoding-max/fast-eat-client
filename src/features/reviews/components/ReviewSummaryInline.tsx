import React from 'react';
import type { ExistingReview } from '@/features/reviews/types';
import { Surface } from '@/../resources/components';

type ReviewSummaryInlineProps = {
  review: ExistingReview;
  label?: string;
};

export default function ReviewSummaryInline({ review, label }: ReviewSummaryInlineProps) {
  return (
    <Surface className="space-y-1 rounded-xl" data-testid="review-summary-inline" variant="muted">
      <p className="text-xs font-black">{label || 'Review submitted'}</p>
      <p className="text-sm">{'★'.repeat(review.rating)}{'☆'.repeat(Math.max(0, 5 - review.rating))}</p>
      {review.comment ? <p className="text-xs text-slate-500 dark:text-slate-400">{review.comment}</p> : null}
    </Surface>
  );
}
