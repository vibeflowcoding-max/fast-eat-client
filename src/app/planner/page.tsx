'use client';

import React from 'react';
import { ArrowRight, Loader2, ShieldAlert, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import BottomNav from '@/components/BottomNav';
import FeatureGateCard from '@/components/FeatureGateCard';
import { Badge, Button, ChoiceCard, FieldLabel, SectionHeader, Surface, TextField } from '@/../resources/components';
import { fetchPlannerRecommendations } from '@/services/api';
import { PlannerRecommendationsResponse } from '@/types';
import { useCartStore } from '@/store';
import { useAppRouter } from '@/hooks/useAppRouter';

export default function PlannerPage() {
  const router = useAppRouter();
  const { dietaryProfile, isAuthenticated } = useCartStore();
  const t = useTranslations('planner');
  const authT = useTranslations('auth.signIn');
  const navT = useTranslations('nav');

  const [budget, setBudget] = React.useState('7000');
  const [serviceMode, setServiceMode] = React.useState<'delivery' | 'pickup'>('delivery');
  const [mood, setMood] = React.useState('comfort');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<PlannerRecommendationsResponse | null>(null);

  const serviceModeOptions = React.useMemo(() => ([
    {
      value: 'delivery',
      title: t('serviceModes.delivery.title'),
      description: t('serviceModes.delivery.description'),
    },
    {
      value: 'pickup',
      title: t('serviceModes.pickup.title'),
      description: t('serviceModes.pickup.description'),
    },
  ] as const), [t]);

  const moodOptions = React.useMemo(() => ([
    {
      value: 'comfort',
      title: t('moods.comfort.title'),
      description: t('moods.comfort.description'),
    },
    {
      value: 'healthy',
      title: t('moods.healthy.title'),
      description: t('moods.healthy.description'),
    },
    {
      value: 'fast',
      title: t('moods.fast.title'),
      description: t('moods.fast.description'),
    },
    {
      value: 'protein',
      title: t('moods.protein.title'),
      description: t('moods.protein.description'),
    },
  ] as const), [t]);

  const handleGenerate = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextResult = await fetchPlannerRecommendations({
        budget: budget ? Number(budget) : undefined,
        serviceMode,
        mood,
        limit: 6,
      });
      setResult(nextResult);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [budget, mood, serviceMode, t]);

  React.useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    handleGenerate();
  }, [handleGenerate, isAuthenticated]);

  return (
    <main className="min-h-screen bg-[#f8f6f2] pb-32 text-slate-900 dark:bg-[#221610] dark:text-slate-100">
      <div className="mx-auto w-full max-w-4xl px-4 pt-6 space-y-5">
        <Surface className="rounded-[2rem]" variant="raised" padding="lg">
          <SectionHeader
            eyebrow={t('eyebrow')}
            title={t('title')}
            description={t('description')}
            action={
              <Button variant="secondary" size="sm" onClick={() => router.push('/profile')}>
                {t('adjustProfile')}
              </Button>
            }
          />
        </Surface>

        {!isAuthenticated ? (
          <FeatureGateCard
            analyticsScope="planner"
            description={t('authDescription')}
            eyebrow={t('eyebrow')}
            icon={<ShieldAlert className="h-6 w-6" />}
            onPrimaryAction={() => router.push('/auth/sign-in')}
            onSecondaryAction={() => router.push('/')}
            primaryLabel={authT('submit')}
            secondaryLabel={navT('home')}
            title={t('authTitle')}
          />
        ) : (
          <>
            <Surface className="space-y-5 rounded-[2rem]" variant="base" padding="lg">
              <SectionHeader
                eyebrow={t('filtersEyebrow')}
                title={t('filtersTitle')}
                description={t('filtersDescription')}
                action={<SlidersHorizontal className="h-5 w-5 text-orange-600 dark:text-orange-300" />}
              />

              <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <TextField
                  type="number"
                  min="0"
                  step="500"
                  inputMode="numeric"
                  label={t('budgetLabel')}
                  description={t('budgetDescription')}
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                />

                <div className="space-y-2">
                  <FieldLabel
                    label={t('moodLabel')}
                    description={t('moodDescription')}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {moodOptions.map((option) => (
                      <ChoiceCard
                        key={option.value}
                        title={option.title}
                        description={option.description}
                        checked={mood === option.value}
                        onClick={() => setMood(option.value)}
                        type="radio"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel
                  label={t('serviceModeLabel')}
                  description={t('serviceModeDescription')}
                />
                <div className="grid gap-2 md:grid-cols-2">
                  {serviceModeOptions.map((option) => (
                    <ChoiceCard
                      key={option.value}
                      title={option.title}
                      description={option.description}
                      checked={serviceMode === option.value}
                      onClick={() => setServiceMode(option.value)}
                      type="radio"
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="neutral" className="px-3 py-1 font-bold">
                  {t('dietLabel')}: {dietaryProfile?.diet && dietaryProfile.diet !== 'none' ? dietaryProfile.diet : t('noFilter')}
                </Badge>
                {(dietaryProfile?.allergies || []).slice(0, 3).map((allergy) => (
                  <Badge key={allergy} variant="warning" className="px-3 py-1 font-bold">
                    {allergy}
                  </Badge>
                ))}
              </div>

              <Button
                onClick={handleGenerate}
                disabled={loading}
                leadingIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                size="md"
              >
                {t('generate')}
              </Button>
            </Surface>

            {error ? (
              <Surface className="rounded-[1.7rem] text-sm text-red-700 dark:text-red-200" variant="raised">
                {error}
              </Surface>
            ) : null}

            {result && result.recommendations.length === 0 ? (
              <Surface className="rounded-[2rem] text-sm" variant="base" padding="lg">
                {t('empty')}
              </Surface>
            ) : null}

            {result ? (
              <section className="space-y-3">
                {result.recommendations.map((recommendation, index) => (
                  <Surface
                    key={`${recommendation.restaurant.id}-${recommendation.item.id}-${index}`}
                    className="space-y-4 rounded-[2rem]"
                    variant="base"
                    padding="lg"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <Badge variant="brand">{recommendation.restaurant.name}</Badge>
                        <div className="space-y-1">
                          <h2 className="text-xl font-black tracking-[-0.02em] text-slate-900 dark:text-slate-100">{recommendation.item.name}</h2>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {recommendation.item.description || t('itemFallbackDescription')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-slate-900 dark:text-slate-100">₡{Math.round(recommendation.item.price).toLocaleString()}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t('score', { value: recommendation.score.toFixed(0) })}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {recommendation.rationale.map((reason) => (
                        <Badge key={reason} variant="neutral">
                          {reason}
                        </Badge>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      leadingIcon={<ArrowRight className="h-4 w-4" />}
                      onClick={() => router.push(`/restaurant/${recommendation.restaurant.id}`)}
                    >
                      {t('viewRestaurant')}
                    </Button>
                  </Surface>
                ))}
              </section>
            ) : null}
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}