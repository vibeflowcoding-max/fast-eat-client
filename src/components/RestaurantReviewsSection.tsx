"use client";

import React from 'react';
import { useTranslations } from 'next-intl';

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
    return <div className="ui-panel rounded-2xl p-4 text-sm ui-text-muted">{t('loading')}</div>;
  }

  if (error) {
    return <div className="ui-state-danger rounded-2xl p-4 text-sm">{error}</div>;
  }

  return (
    <section className="ui-panel rounded-2xl p-4 space-y-4">
      <header>
        <h2 className="text-lg font-black">{t('title')}</h2>
        <p className="ui-text-muted text-sm">{t('subtitle')}</p>
      </header>

      <div className="ui-panel-soft rounded-xl p-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{summary?.restaurantName || t('branchFallback')}</p>
          <p className="ui-text-muted text-xs">{t('reviewCount', { count: summary?.reviewCount ?? 0 })}</p>
        </div>
        <div className="text-lg font-black">
          ★ {summary?.avgRating != null ? summary.avgRating.toFixed(1) : t('noRating')}
        </div>
      </div>

      {reviews.length === 0 ? (
        <p className="ui-text-muted text-sm">{t('empty')}</p>
      ) : (
        <div className="space-y-2">
          {reviews.map((review) => (
            <article key={review.id} className="ui-panel-soft rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black">{review.branchName || t('branchFallback')}</p>
                <span className="ui-text-muted text-[11px]">
                  {review.createdAt ? new Date(review.createdAt).toLocaleDateString('es-CR') : ''}
                </span>
              </div>
              <p className="text-sm">{review.rating != null ? `★ ${review.rating.toFixed(1)}` : t('noRating')}</p>
              <p className="ui-text-muted text-sm">{review.comment}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
