"use client";

import React from 'react';
import { Sparkles, Search, MapPin, Tag, Star, Clock3, Loader2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useCategories } from '@/hooks/useCategories';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useCartStore } from '@/store';

const intentChips = [
  { id: 'promotions', label: 'Promos' },
  { id: 'fast', label: 'Cerca de mí' },
  { id: 'best_rated', label: 'Mejor calidad' },
  { id: 'cheap', label: 'Económico' }
] as const;

type IntentId = (typeof intentChips)[number]['id'];
type AiSuggestion = { type: 'query' | 'category' | 'intent'; value: string; label: string };

type RecentSearch = { query: string; createdAt: string };

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function SearchPage() {
  const router = useAppRouter();
  const { userLocation, fromNumber, customerName } = useCartStore();
  const { categories } = useCategories();
  const { restaurants, loading, error } = useRestaurants({ userLocation });

  const [query, setQuery] = React.useState('');
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);
  const [activeIntent, setActiveIntent] = React.useState<IntentId | null>(null);
  const [recentSearches, setRecentSearches] = React.useState<RecentSearch[]>([]);
  const [aiMessage, setAiMessage] = React.useState('Usa IA para afinar tu búsqueda con base en tus hábitos');
  const [aiSuggestions, setAiSuggestions] = React.useState<AiSuggestion[]>([]);
  const [loadingAi, setLoadingAi] = React.useState(false);

  const fetchRecentSearches = React.useCallback(async () => {
    if (!fromNumber) {
      setRecentSearches([]);
      return;
    }

    const response = await fetch(`/api/search/recent?phone=${encodeURIComponent(fromNumber)}`);
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    setRecentSearches(Array.isArray(data.recentSearches) ? data.recentSearches : []);
  }, [fromNumber]);

  const fetchAiSuggestions = React.useCallback(async (searchText: string, recent: RecentSearch[]) => {
    setLoadingAi(true);

    try {
      const response = await fetch('/api/search/ai-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchText,
          recentSearches: recent.map((item) => item.query).slice(0, 5),
          categories: categories.map((category) => ({ id: category.id, name: category.name }))
        })
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setAiMessage(typeof data.assistantMessage === 'string' ? data.assistantMessage : aiMessage);
      setAiSuggestions(Array.isArray(data.suggestions) ? data.suggestions.slice(0, 8) : []);
    } finally {
      setLoadingAi(false);
    }
  }, [categories, aiMessage]);

  React.useEffect(() => {
    fetchRecentSearches();
  }, [fetchRecentSearches]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchAiSuggestions(query, recentSearches);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query, recentSearches, fetchAiSuggestions]);

  const saveSearch = React.useCallback(async (value: string) => {
    const clean = value.trim();
    if (!clean || !fromNumber) {
      return;
    }

    await fetch('/api/search/recent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: fromNumber,
        name: customerName,
        query: clean
      })
    });

    await fetchRecentSearches();
  }, [customerName, fetchRecentSearches, fromNumber]);

  const applySuggestion = React.useCallback(async (suggestion: AiSuggestion) => {
    if (suggestion.type === 'query') {
      setQuery(suggestion.value);
      await saveSearch(suggestion.value);
      return;
    }

    if (suggestion.type === 'category') {
      setSelectedCategoryId(suggestion.value);
      return;
    }

    if (suggestion.type === 'intent' && ['promotions', 'fast', 'best_rated', 'cheap'].includes(suggestion.value)) {
      setActiveIntent(suggestion.value as IntentId);
    }
  }, [saveSearch]);

  const queryNormalized = normalize(query);

  const filteredRestaurants = React.useMemo(() => {
    return restaurants.filter((restaurant) => {
      const categoryMatch = selectedCategoryId
        ? restaurant.categories.some((category) => category.id === selectedCategoryId)
        : true;

      const queryMatch = !queryNormalized
        ? true
        : restaurant.name.toLowerCase().includes(queryNormalized) ||
          restaurant.categories.some((category) => category.name.toLowerCase().includes(queryNormalized));

      const intentMatch = (() => {
        if (!activeIntent) {
          return true;
        }

        if (activeIntent === 'promotions') {
          return Boolean(restaurant.promo_text);
        }

        if (activeIntent === 'fast') {
          return typeof restaurant.eta_min === 'number' ? restaurant.eta_min <= 30 : false;
        }

        if (activeIntent === 'best_rated') {
          return typeof restaurant.rating === 'number' ? restaurant.rating >= 4.5 : false;
        }

        if (activeIntent === 'cheap') {
          return typeof restaurant.avg_price_estimate === 'number' ? restaurant.avg_price_estimate <= 6000 : false;
        }

        return true;
      })();

      return categoryMatch && queryMatch && intentMatch;
    });
  }, [activeIntent, queryNormalized, restaurants, selectedCategoryId]);

  const submitSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveSearch(query);
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-32">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 space-y-5">
        <header className="space-y-2">
          <h1 className="text-2xl font-black text-gray-900">Búsqueda inteligente</h1>
          <p className="text-sm text-gray-500">Busca por IA, categorías y filtros como en Inicio.</p>
        </header>

        <form onSubmit={submitSearch} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="¿Qué se te antoja hoy?"
              className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600 transition-colors"
            >
              Buscar
            </button>
          </div>
        </form>

        <section className="rounded-2xl border border-orange-100 bg-orange-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-orange-700">
            <Sparkles className="w-4 h-4" />
            <h2 className="text-sm font-black">Sugerencias IA</h2>
          </div>
          <p className="text-xs text-orange-800">{aiMessage}</p>
          {loadingAi ? (
            <div className="flex items-center gap-2 text-xs text-orange-700">
              <Loader2 className="w-3 h-3 animate-spin" />
              Generando sugerencias...
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {aiSuggestions.map((suggestion) => (
                <button
                  key={`${suggestion.type}-${suggestion.value}`}
                  type="button"
                  onClick={() => applySuggestion(suggestion)}
                  className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
                >
                  {suggestion.label}
                </button>
              ))}
              {aiSuggestions.length === 0 && (
                <span className="text-xs text-orange-700">Escribe algo para recibir sugerencias personalizadas.</span>
              )}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-black uppercase tracking-wide text-gray-500">Búsquedas recientes (máx. 5)</h2>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search) => (
              <button
                key={`${search.query}-${search.createdAt}`}
                type="button"
                onClick={() => setQuery(search.query)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-100 transition-colors"
              >
                {search.query}
              </button>
            ))}
            {recentSearches.length === 0 && (
              <span className="text-xs text-gray-500">Aún no tienes búsquedas guardadas.</span>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-black uppercase tracking-wide text-gray-500">Filtrar por categoría</h2>
          <div className="flex overflow-x-auto gap-2 pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                selectedCategoryId === null
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              Todas
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategoryId(category.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold border whitespace-nowrap transition-colors ${
                  selectedCategoryId === category.id
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-black uppercase tracking-wide text-gray-500">Filtros rápidos</h2>
          <div className="flex flex-wrap gap-2">
            {intentChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setActiveIntent((prev) => (prev === chip.id ? null : chip.id))}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                  activeIntent === chip.id
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-black text-gray-900">Resultados</h2>
          {loading && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500">Cargando restaurantes...</div>
          )}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}
          {!loading && !error && filteredRestaurants.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
              No encontramos resultados con estos filtros. Intenta otra combinación.
            </div>
          )}

          {filteredRestaurants.map((restaurant) => (
            <article
              key={restaurant.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/${restaurant.slug || slugify(restaurant.name)}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  router.push(`/${restaurant.slug || slugify(restaurant.name)}`);
                }
              }}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-2 cursor-pointer hover:border-orange-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-gray-900">{restaurant.name}</h3>
                  <p className="text-xs text-gray-500">{restaurant.categories.map((category) => category.name).join(' • ')}</p>
                </div>
                {restaurant.promo_text && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-700">
                    <Tag className="w-3 h-3" />
                    Promo
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-[11px] text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {restaurant.rating ? restaurant.rating.toFixed(1) : 'N/D'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="w-3 h-3" />
                  {restaurant.eta_min ? `${restaurant.eta_min} min` : 'ETA N/D'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {typeof restaurant.distance === 'number' ? `${restaurant.distance.toFixed(1)} km` : 'Sin distancia'}
                </span>
              </div>
            </article>
          ))}
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
