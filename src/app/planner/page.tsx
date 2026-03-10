'use client';

import React from 'react';
import { ArrowRight, Loader2, ShieldAlert, SlidersHorizontal, Sparkles } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { Badge, Button, ChoiceCard, FieldLabel, SectionHeader, Surface, TextField } from '@/../resources/components';
import { fetchPlannerRecommendations } from '@/services/api';
import { PlannerRecommendationsResponse } from '@/types';
import { useCartStore } from '@/store';
import { useAppRouter } from '@/hooks/useAppRouter';

const serviceModeOptions = [
  {
    value: 'delivery',
    title: 'Delivery',
    description: 'Prioriza opciones listas para pedir y recibir sin moverte.',
  },
  {
    value: 'pickup',
    title: 'Pickup',
    description: 'Busca ideas que tengan más sentido para recoger en tienda.',
  },
] as const;

const moodOptions = [
  { value: 'comfort', title: 'Comfort', description: 'Comida cálida y antojo seguro.' },
  { value: 'healthy', title: 'Healthy', description: 'Opciones más ligeras y balanceadas.' },
  { value: 'fast', title: 'Fast', description: 'Decisiones rápidas para salir del paso.' },
  { value: 'protein', title: 'Protein boost', description: 'Más proteína para comidas de alto rendimiento.' },
] as const;

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
    <main className="min-h-screen bg-[#f8f6f2] pb-32 text-slate-900 dark:bg-[#221610] dark:text-slate-100">
      <div className="mx-auto w-full max-w-4xl px-4 pt-6 space-y-5">
        <Surface className="rounded-[2rem]" variant="raised" padding="lg">
          <SectionHeader
            eyebrow="Planner IA"
            title="Comidas sugeridas para este momento"
            description="Usa tu perfil alimenticio, presupuesto y modo de servicio para encontrar combinaciones más cercanas a lo que realmente quieres pedir."
            action={
              <Button variant="secondary" size="sm" onClick={() => router.push('/profile')}>
                Ajustar perfil
              </Button>
            }
          />
        </Surface>

        {!isAuthenticated ? (
          <Surface className="rounded-[2rem] text-sm" variant="base" padding="lg">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" />
              <div className="space-y-2">
                <p className="font-black">Necesitas iniciar sesión para usar recomendaciones personalizadas.</p>
                <p className="text-slate-500 dark:text-slate-400">El planner usa tu perfil alimenticio sincronizado para filtrar ideas con más precisión.</p>
              </div>
            </div>
          </Surface>
        ) : (
          <>
            <Surface className="space-y-5 rounded-[2rem]" variant="base" padding="lg">
              <SectionHeader
                eyebrow="Filtros"
                title="Ajusta la búsqueda"
                description="Cada cambio actualiza el tipo de recomendaciones que el planner prioriza para ti."
                action={<SlidersHorizontal className="h-5 w-5 text-orange-600 dark:text-orange-300" />}
              />

              <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <TextField
                  type="number"
                  min="0"
                  step="500"
                  inputMode="numeric"
                  label="Presupuesto máximo"
                  description="El planner intentará mantenerse dentro de este rango."
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                />

                <div className="space-y-2">
                  <FieldLabel
                    label="Mood"
                    description="Define el tipo de comida que quieres priorizar en esta búsqueda."
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
                  label="Modalidad"
                  description="Cambiarla altera restaurantes, tiempos y formatos sugeridos."
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
                  Dieta: {dietaryProfile?.diet && dietaryProfile.diet !== 'none' ? dietaryProfile.diet : 'Sin filtro'}
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
                Generar recomendaciones
              </Button>
            </Surface>

            {error ? (
              <Surface className="rounded-[1.7rem] text-sm text-red-700 dark:text-red-200" variant="raised">
                {error}
              </Surface>
            ) : null}

            {result && result.recommendations.length === 0 ? (
              <Surface className="rounded-[2rem] text-sm" variant="base" padding="lg">
                No encontramos opciones con esos filtros. Prueba con un mayor presupuesto o cambia la modalidad.
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
                            {recommendation.item.description || 'Recomendación ajustada a tu perfil actual.'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-slate-900 dark:text-slate-100">₡{Math.round(recommendation.item.price).toLocaleString()}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Score {recommendation.score.toFixed(0)}</p>
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
                      Ver restaurante
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