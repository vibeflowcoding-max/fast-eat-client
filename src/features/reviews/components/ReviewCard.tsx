import React from 'react';
import ReviewComposer from '@/features/reviews/components/ReviewComposer';
import ReviewSummaryInline from '@/features/reviews/components/ReviewSummaryInline';
import type { ExistingReview } from '@/features/reviews/types';
import { Surface } from '@/../resources/components';

type ReviewCardProps = {
  title: string;
  subtitle: string;
  existingReview: ExistingReview | null;
  canReview: boolean;
  disabledReason?: string | null;
  submitting?: boolean;
  dismissKey?: string;
  onSubmit: (payload: { rating: number; comment: string }) => Promise<void> | void;
};

export default function ReviewCard({
  title,
  subtitle,
  existingReview,
  canReview,
  disabledReason = null,
  submitting = false,
  dismissKey,
  onSubmit
}: ReviewCardProps) {
  const storageKey = React.useMemo(
    () => (dismissKey ? `fast-eat:review-card-dismiss:${dismissKey}` : null),
    [dismissKey]
  );

  const [dismissed, setDismissed] = React.useState<boolean>(() => {
    if (typeof window === 'undefined' || !storageKey) {
      return false;
    }

    return window.sessionStorage.getItem(storageKey) === '1';
  });

  const handleDismiss = React.useCallback(() => {
    setDismissed(true);
    if (typeof window !== 'undefined' && storageKey) {
      window.sessionStorage.setItem(storageKey, '1');
    }
  }, [storageKey]);

  if (!existingReview && dismissed) {
    return null;
  }

  return (
    <Surface asChild className="space-y-3 rounded-[1.5rem]" variant="base">
      <article>
      <header className="space-y-1">
        <h4 className="text-sm font-black">{title}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </header>

      {existingReview ? (
        <ReviewSummaryInline review={existingReview} />
      ) : (
        <ReviewComposer
          disabled={!canReview}
          disabledReason={!canReview ? disabledReason : null}
          submitting={submitting}
          onSubmit={onSubmit}
          onDismiss={canReview ? handleDismiss : undefined}
        />
      )}
      </article>
    </Surface>
  );
}
