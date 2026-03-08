"use client";

import React from 'react';
import { Sparkles, Search, Loader2 } from 'lucide-react';
import { Badge, Button, EmptyState, SectionHeader, Surface, TextField } from '@/../resources/components';
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
    <main className="min-h-screen bg-[#f8f6f2] pb-32 text-slate-900 dark:bg-[#221610] dark:text-slate-100">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 space-y-5">
        <header className="space-y-2">
          <h1 className="text-3xl font-black tracking-[-0.03em]">{t('title')}</h1>
          <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
        </header>

        <Surface className="rounded-[1.75rem]" variant="base">
          <form className="flex items-end gap-3" onSubmit={submitSearch}>
            <div className="min-w-0 flex-1">
              <TextField
                aria-label={t('searchPlaceholder')}
                leadingIcon={<Search className="h-4 w-4" />}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('searchPlaceholder')}
                value={query}
              />
            </div>
            <Button className="shrink-0" type="submit" variant="primary">
              {t('searchButton')}
            </Button>
          </form>
        </Surface>

        <Surface className="space-y-3 rounded-[1.75rem]" variant="raised">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <h2 className="text-sm font-black">{t('aiSuggestions')}</h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">{aiMessage}</p>
          {loadingAi ? (
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t('aiGenerating')}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {aiSuggestions.map((suggestion) => (
                <Button
                  key={`${suggestion.type}-${suggestion.value}`}
                  onClick={() => applySuggestion(suggestion)}
                  size="sm"
                  variant="secondary"
                >
                  {suggestion.label}
                </Button>
              ))}
              {aiSuggestions.length === 0 && (
                <span className="text-xs text-slate-600 dark:text-slate-300">{t('aiEmpty')}</span>
              )}
            </div>
          )}
        </Surface>

        <section className="space-y-2">
          <SectionHeader eyebrow={t('recentSearches')} title=" " className="block" />
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search) => (
              <Button
                key={`${search.query}-${search.createdAt}`}
                onClick={() => setQuery(search.query)}
                size="sm"
                variant="outline"
              >
                {search.query}
              </Button>
            ))}
            {recentSearches.length === 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400">{t('recentSearchesEmpty')}</span>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <SectionHeader eyebrow={t('filterByCategory')} title=" " className="block" />
          <div className="flex overflow-x-auto gap-2 pb-1">
            <Button
              onClick={() => setSelectedCategoryId(null)}
              size="sm"
              variant={selectedCategoryId === null ? 'primary' : 'outline'}
            >
              {t('allCategories')}
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className="whitespace-nowrap"
                size="sm"
                variant={selectedCategoryId === category.id ? 'primary' : 'outline'}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <SectionHeader eyebrow={t('quickFilters')} title=" " className="block" />
          <div className="flex flex-wrap gap-2">
            {intentChips.map((chip) => (
              <Button
                key={chip.id}
                onClick={() => setActiveIntent((prev) => (prev === chip.id ? null : chip.id))}
                size="sm"
                variant={activeIntent === chip.id ? 'primary' : 'outline'}
              >
                {t(chip.labelKey)}
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader eyebrow={t('results')} title=" " className="block" />
          {loading && (
            <Surface className="rounded-2xl text-sm text-slate-500 dark:text-slate-400" variant="muted">{t('loadingRestaurants')}</Surface>
          )}
          {error && (
            <Surface className="rounded-2xl text-sm text-red-700 dark:text-red-200" variant="raised">{error}</Surface>
          )}
          {!loading && !error && filteredRestaurants.length === 0 && (
            <EmptyState description={t('emptyResults')} title={t('results')} />
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
