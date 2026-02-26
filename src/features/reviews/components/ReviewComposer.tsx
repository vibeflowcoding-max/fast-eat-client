import React from 'react';

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
            className={`text-xl leading-none ${star <= rating ? 'text-amber-500' : 'ui-text-muted'}`}
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
        className="ui-input min-h-[96px] w-full rounded-xl px-3 py-2 text-sm"
        placeholder="Optional comment"
      />

      <div className="ui-text-muted text-xs text-right">{trimmedComment.length}/{maxCommentLength}</div>

      {disabledReason ? <div className="ui-text-muted text-xs">{disabledReason}</div> : null}
      {error ? <div className="ui-state-danger rounded-xl px-3 py-2 text-xs">{error}</div> : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitDisabled}
          className="ui-btn-primary rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60"
        >
          {submitting ? 'Sending...' : submitLabel}
        </button>

        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="ui-btn-secondary rounded-xl px-4 py-2 text-sm font-semibold"
          >
            {dismissLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
