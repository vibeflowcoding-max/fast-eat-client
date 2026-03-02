"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAppRouter } from '@/hooks/useAppRouter';
import BottomNav from '@/components/BottomNav';
import RestaurantReviewsSection from '@/components/RestaurantReviewsSection';

export default function BranchReviewsPage() {
  const t = useTranslations('restaurantReviews');
  const router = useAppRouter();
  const params = useParams<{ branchId: string }>();

  if (!params?.branchId) {
    return (
      <main className="ui-page min-h-screen pb-32">
        <div className="mx-auto w-full max-w-3xl px-4 pt-6">
          <div className="ui-state-danger rounded-2xl p-4 text-sm">Missing branchId</div>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="ui-page min-h-screen pb-32">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 space-y-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="ui-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToMenu')}
        </button>

        <RestaurantReviewsSection branchId={params.branchId} limit={50} />
      </div>

      <BottomNav />
    </main>
  );
}
