"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button, Surface } from '@/../resources/components';
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
      <main className="min-h-screen bg-[#f8f6f2] pb-32 text-slate-900 dark:bg-[#221610] dark:text-slate-100">
        <div className="mx-auto w-full max-w-3xl px-4 pt-6">
          <Surface className="rounded-2xl text-sm text-red-700 dark:text-red-200" variant="raised">Missing branchId</Surface>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f6f2] pb-32 text-slate-900 dark:bg-[#221610] dark:text-slate-100">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          leadingIcon={<ArrowLeft className="w-4 h-4" />}
        >
          {t('backToMenu')}
        </Button>

        <RestaurantReviewsSection branchId={params.branchId} limit={50} />
      </div>

      <BottomNav />
    </main>
  );
}
