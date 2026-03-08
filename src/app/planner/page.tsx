'use client';

import React from 'react';
import { Loader2, Sparkles, SlidersHorizontal, ShieldAlert } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { fetchPlannerRecommendations } from '@/services/api';
import { PlannerRecommendationsResponse } from '@/types';
import { useCartStore } from '@/store';
import { useAppRouter } from '@/hooks/useAppRouter';

export default function PlannerPage() {
  const router = useAppRouter();
  const { dietaryProfile, isAuthenticated } = useCartStore();

  const [budget, setBudget] = React.useState('7000');
  const [serviceMode, setServiceMode] = React.useState<'delivery' | 'pickup'>('delivery');
  const [mood, setMood] = React.useState('comfort');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<PlannerRecommendationsResponse | null>(null);

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
      setError(requestError instanceof Error ? requestError.message : 'No se pudieron generar recomendaciones.');
    } finally {
      setLoading(false);
    }
  }, [budget, mood, serviceMode]);

  React.useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    handleGenerate();
  }, [handleGenerate, isAuthenticated]);

  return (
    <main className="ui-page min-h-screen pb-32">
      <div className="mx-auto w-full max-w-4xl px-4 pt-6 space-y-5">
        <header className="ui-panel rounded-[2rem] p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <p className="ui-section-title">Planner IA</p>
              <h1 className="text-3xl font-black tracking-[-0.03em] text-[var(--color-text)]">Comidas sugeridas para este momento</h1>
              <p className="ui-text-muted max-w-2xl text-sm">
                Usa tu perfil alimenticio, presupuesto y modo de servicio para encontrar combinaciones más cercanas a lo que realmente quieres pedir.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/profile')}
              className="ui-btn-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black"
            >
              Ajustar perfil
            </button>
          </div>
        </header>

        {!isAuthenticated ? (
          <section className="ui-panel rounded-[2rem] p-5 text-sm text-[var(--color-text)]">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" />
              <div className="space-y-2">
                <p className="font-black">Necesitas iniciar sesión para usar recomendaciones personalizadas.</p>
                <p className="ui-text-muted">El planner usa tu perfil alimenticio sincronizado para filtrar ideas con más precisión.</p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="ui-panel rounded-[2rem] p-5 space-y-4">
              <div className="flex items-center gap-2 text-[var(--color-text)]">
                <SlidersHorizontal className="h-4 w-4 text-[var(--color-brand)]" />
                <h2 className="text-lg font-black">Filtros</h2>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-sm font-semibold text-[var(--color-text)]">
                  Presupuesto máximo
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                    className="ui-input mt-1 rounded-xl px-3 py-2 text-sm"
                  />
                </label>

                <label className="text-sm font-semibold text-[var(--color-text)]">
                  Modalidad
                  <select
                    value={serviceMode}
                    onChange={(event) => setServiceMode(event.target.value as 'delivery' | 'pickup')}
                    className="ui-select mt-1 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="delivery">Delivery</option>
                    <option value="pickup">Pickup</option>
                  </select>
                </label>

                <label className="text-sm font-semibold text-[var(--color-text)]">
                  Mood
                  <select
                    value={mood}
                    onChange={(event) => setMood(event.target.value)}
                    className="ui-select mt-1 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="comfort">Comfort</option>
                    <option value="healthy">Healthy</option>
                    <option value="fast">Fast</option>
                    <option value="protein">Protein boost</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-[var(--color-surface-soft)] px-3 py-1 font-black text-[var(--color-text)]">
                  Dieta: {dietaryProfile?.diet && dietaryProfile.diet !== 'none' ? dietaryProfile.diet : 'Sin filtro'}
                </span>
                {(dietaryProfile?.allergies || []).slice(0, 3).map((allergy) => (
                  <span key={allergy} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-black text-amber-700">
                    {allergy}
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="ui-btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-black disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generar recomendaciones
              </button>
            </section>

            {error ? <section className="ui-state-danger rounded-[1.7rem] p-4 text-sm">{error}</section> : null}

            {result && result.recommendations.length === 0 ? (
              <section className="ui-panel rounded-[2rem] p-5 text-sm text-[var(--color-text)]">
                No encontramos opciones con esos filtros. Prueba con un mayor presupuesto o cambia la modalidad.
              </section>
            ) : null}

            {result ? (
              <section className="space-y-3">
                {result.recommendations.map((recommendation, index) => (
                  <article key={`${recommendation.restaurant.id}-${recommendation.item.id}-${index}`} className="ui-panel rounded-[2rem] p-5 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="ui-section-title">{recommendation.restaurant.name}</p>
                        <h2 className="text-xl font-black tracking-[-0.02em] text-[var(--color-text)]">{recommendation.item.name}</h2>
                        <p className="ui-text-muted text-sm">{recommendation.item.description || 'Recomendación ajustada a tu perfil actual.'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-[var(--color-text)]">₡{Math.round(recommendation.item.price).toLocaleString()}</p>
                        <p className="ui-text-muted text-xs">Score {recommendation.score.toFixed(0)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {recommendation.rationale.map((reason) => (
                        <span key={reason} className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-text)]">
                          {reason}
                        </span>
                      ))}
                    </div>
                  </article>
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