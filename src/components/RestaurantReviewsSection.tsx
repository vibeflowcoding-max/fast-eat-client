"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { EmptyState, RatingDisplay, SectionHeader, Surface } from '@/../resources/components';

type RestaurantReviewsSectionProps = {
  branchId: string;
  limit?: number;
};

type ReviewSummary = {
  restaurantId: string;
  restaurantName: string;
  avgRating: number | null;
  reviewCount: number;
};

type BranchReview = {
  id: string;
  branchId: string;
  branchName: string;
  rating: number | null;
  comment: string;
  createdAt: string | null;
};

export default function RestaurantReviewsSection({ branchId, limit = 6 }: RestaurantReviewsSectionProps) {
  const t = useTranslations('restaurantReviews');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = React.useState<BranchReview[]>([]);

  React.useEffect(() => {
    let mounted = true;

    async function fetchReviews() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/branches/${encodeURIComponent(branchId)}/reviews?limit=${encodeURIComponent(String(limit))}`
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(typeof payload?.error === 'string' ? payload.error : t('loadError'));
        }

        if (!mounted) {
          return;
        }

        setSummary(payload.summary ?? null);
        setReviews(Array.isArray(payload.reviews) ? payload.reviews : []);
      } catch (requestError) {
        if (!mounted) {
          return;
        }

        setError(requestError instanceof Error ? requestError.message : t('loadError'));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchReviews();

    return () => {
      mounted = false;
    };
  }, [branchId, limit, t]);

  if (loading) {
    return <Surface className="rounded-2xl text-sm text-slate-500 dark:text-slate-400" variant="muted">{t('loading')}</Surface>;
  }

  if (error) {
    return <Surface className="rounded-2xl text-sm text-red-700 dark:text-red-200" variant="raised">{error}</Surface>;
  }

  return (
    <Surface className="space-y-4 rounded-2xl" variant="base">
      <SectionHeader title={t('title')} description={t('subtitle')} />

      <Surface className="flex items-center justify-between gap-3 rounded-xl" variant="muted">
        <div>
          <p className="text-sm font-bold">{summary?.restaurantName || t('branchFallback')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('reviewCount', { count: summary?.reviewCount ?? 0 })}</p>
        </div>
        {summary?.avgRating != null ? (
          <RatingDisplay rating={summary.avgRating.toFixed(1)} reviewCount={summary?.reviewCount ?? 0} />
        ) : (
          <p className="text-lg font-black">{t('noRating')}</p>
        )}
      </Surface>

      {reviews.length === 0 ? (
        <EmptyState
          title={t('title')}
          description={t('empty')}
          action={null}
        />
      ) : (
        <div className="space-y-2">
          {reviews.map((review) => (
            <Surface key={review.id} className="space-y-1 rounded-xl" variant="muted">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black">{review.branchName || t('branchFallback')}</p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {review.createdAt ? new Date(review.createdAt).toLocaleDateString('es-CR') : ''}
                </span>
              </div>
              <p className="text-sm">{review.rating != null ? `★ ${review.rating.toFixed(1)}` : t('noRating')}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{review.comment}</p>
            </Surface>
          ))}
        </div>
      )}
    </Surface>
  );
}
