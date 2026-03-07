"use client";

import React from 'react';
import { Sparkles, Search, Loader2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import RestaurantCard from '@/components/RestaurantCard';
import { useCategories } from '@/hooks/useCategories';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useCartStore } from '@/store';
import { useTranslations } from 'next-intl';

const intentChips = [
  { id: 'promotions', labelKey: 'intents.promotions' },
  { id: 'fast', labelKey: 'intents.fast' },
  { id: 'best_rated', labelKey: 'intents.bestRated' },
  { id: 'cheap', labelKey: 'intents.cheap' }
] as const;

type IntentId = (typeof intentChips)[number]['id'];
type AiSuggestion = { type: 'query' | 'category' | 'intent'; value: string; label: string };

type RecentSearch = { query: string; createdAt: string };

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export default function SearchPageContent() {
  const t = useTranslations('search');
  const { userLocation, fromNumber, customerName } = useCartStore();
  const { categories } = useCategories();
  const { restaurants, loading, error } = useRestaurants({ userLocation });

  const [query, setQuery] = React.useState('');
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);
  const [activeIntent, setActiveIntent] = React.useState<IntentId | null>(null);
  const [recentSearches, setRecentSearches] = React.useState<RecentSearch[]>([]);
  const [aiMessage, setAiMessage] = React.useState(t('aiDefaultMessage'));
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
    <main className="ui-page min-h-screen pb-32">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 space-y-5">
        <header className="space-y-2">
          <h1 className="text-3xl font-black tracking-[-0.03em]">{t('title')}</h1>
          <p className="ui-text-muted max-w-2xl text-sm">{t('subtitle')}</p>
        </header>

        <form onSubmit={submitSearch} className="ui-panel rounded-[1.75rem] p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Search className="ui-text-muted h-4 w-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchPlaceholder')}
              className="ui-text w-full bg-transparent text-sm placeholder:text-[var(--color-text-muted)] outline-none"
            />
            <button
              type="submit"
              className="ui-btn-primary rounded-full px-4 py-2 text-xs font-black transition-colors"
            >
              {t('searchButton')}
            </button>
          </div>
        </form>

        <section className="ui-chip-brand rounded-[1.75rem] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <h2 className="text-sm font-black">{t('aiSuggestions')}</h2>
          </div>
          <p className="text-xs">{aiMessage}</p>
          {loadingAi ? (
            <div className="flex items-center gap-2 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t('aiGenerating')}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {aiSuggestions.map((suggestion) => (
                <button
                  key={`${suggestion.type}-${suggestion.value}`}
                  type="button"
                  onClick={() => applySuggestion(suggestion)}
                  className="ui-btn-secondary rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                >
                  {suggestion.label}
                </button>
              ))}
              {aiSuggestions.length === 0 && (
                <span className="text-xs">{t('aiEmpty')}</span>
              )}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="ui-text-muted text-xs font-black uppercase tracking-wide">{t('recentSearches')}</h2>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search) => (
              <button
                key={`${search.query}-${search.createdAt}`}
                type="button"
                onClick={() => setQuery(search.query)}
                className="ui-btn-secondary rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              >
                {search.query}
              </button>
            ))}
            {recentSearches.length === 0 && (
              <span className="ui-text-muted text-xs">{t('recentSearchesEmpty')}</span>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="ui-text-muted text-xs font-black uppercase tracking-wide">{t('filterByCategory')}</h2>
          <div className="flex overflow-x-auto gap-2 pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                selectedCategoryId === null
                    ? 'ui-btn-primary border-transparent'
                    : 'ui-btn-secondary'
              }`}
            >
              {t('allCategories')}
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategoryId(category.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold border whitespace-nowrap transition-colors ${
                  selectedCategoryId === category.id
                      ? 'ui-btn-primary border-transparent'
                      : 'ui-btn-secondary'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="ui-text-muted text-xs font-black uppercase tracking-wide">{t('quickFilters')}</h2>
          <div className="flex flex-wrap gap-2">
            {intentChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setActiveIntent((prev) => (prev === chip.id ? null : chip.id))}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                  activeIntent === chip.id
                    ? 'ui-btn-primary border-transparent'
                    : 'ui-btn-secondary'
                }`}
              >
                {t(chip.labelKey)}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-black tracking-[0.06em] uppercase text-[var(--color-text-muted)]">{t('results')}</h2>
          {loading && (
            <div className="ui-panel rounded-2xl p-4 text-sm ui-text-muted">{t('loadingRestaurants')}</div>
          )}
          {error && (
            <div className="ui-state-danger rounded-2xl p-4 text-sm">{error}</div>
          )}
          {!loading && !error && filteredRestaurants.length === 0 && (
            <div className="ui-panel rounded-2xl p-4 text-sm ui-text-muted">
              {t('emptyResults')}
            </div>
          )}

          <div className="grid gap-3">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
              />
            ))}
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
