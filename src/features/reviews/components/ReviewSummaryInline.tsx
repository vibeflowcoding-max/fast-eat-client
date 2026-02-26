import React from 'react';
import type { ExistingReview } from '@/features/reviews/types';

type ReviewSummaryInlineProps = {
  review: ExistingReview;
  label?: string;
};

export default function ReviewSummaryInline({ review, label }: ReviewSummaryInlineProps) {
  return (
    <div className="ui-panel-soft rounded-xl p-3 space-y-1" data-testid="review-summary-inline">
      <p className="text-xs font-black">{label || 'Review submitted'}</p>
      <p className="text-sm">{'★'.repeat(review.rating)}{'☆'.repeat(Math.max(0, 5 - review.rating))}</p>
      {review.comment ? <p className="ui-text-muted text-xs">{review.comment}</p> : null}
    </div>
  );
}
