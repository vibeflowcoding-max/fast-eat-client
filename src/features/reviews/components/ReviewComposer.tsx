import React from 'react';
import { Button, Surface } from '@/../resources/components';

const starBaseClassName = 'flex h-10 w-10 items-center justify-center rounded-full border transition-colors';
const starActiveClassName = 'border-amber-200 bg-amber-50 text-amber-500 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200';
const starInactiveClassName = 'border-slate-200 bg-[#fcf7f1] text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500';
const textAreaClassName = 'min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800';

type ReviewComposerProps = {
  disabled?: boolean;
  disabledReason?: string | null;
  submitting?: boolean;
  initialRating?: number;
  initialComment?: string;
  submitLabel?: string;
  dismissLabel?: string;
  maxCommentLength?: number;
  onSubmit: (payload: { rating: number; comment: string }) => Promise<void> | void;
  onDismiss?: () => void;
};

export default function ReviewComposer({
  disabled = false,
  disabledReason = null,
  submitting = false,
  initialRating = 0,
  initialComment = '',
  submitLabel = 'Submit review',
  dismissLabel = 'Not now',
  maxCommentLength = 500,
  onSubmit,
  onDismiss
}: ReviewComposerProps) {
  const [rating, setRating] = React.useState(initialRating);
  const [comment, setComment] = React.useState(initialComment);
  const [error, setError] = React.useState<string | null>(null);

  const trimmedComment = comment.trim();
  const submitDisabled = disabled || submitting || rating < 1 || rating > 5 || trimmedComment.length > maxCommentLength;

  const handleSubmit = async () => {
    if (submitDisabled) {
      return;
    }

    try {
      setError(null);
      await onSubmit({ rating, comment: trimmedComment });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Could not submit review');
    }
  };

  return (
    <div className="space-y-3" data-testid="review-composer">
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`Set rating ${star}`}
            disabled={disabled || submitting}
            onClick={() => setRating(star)}
            className={`${starBaseClassName} ${star <= rating ? starActiveClassName : starInactiveClassName}`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        disabled={disabled || submitting}
        onChange={(event) => setComment(event.target.value)}
        maxLength={maxCommentLength}
        className={textAreaClassName}
        placeholder="Optional comment"
      />

      <div className="text-right text-xs text-slate-500 dark:text-slate-400">{trimmedComment.length}/{maxCommentLength}</div>

      {disabledReason ? <div className="text-xs text-slate-500 dark:text-slate-400">{disabledReason}</div> : null}
      {error ? <Surface className="rounded-xl px-3 py-2 text-xs text-red-700 dark:text-red-200" padding="none" variant="raised">{error}</Surface> : null}

      <div className="flex items-center gap-2">
        <Button
          onClick={handleSubmit}
          disabled={submitDisabled}
          size="sm"
        >
          {submitting ? 'Sending...' : submitLabel}
        </Button>

        {onDismiss ? (
          <Button
            onClick={onDismiss}
            size="sm"
            variant="outline"
          >
            {dismissLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
