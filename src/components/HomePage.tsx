"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useCartStore } from '@/store';
import { useCategories } from '@/hooks/useCategories';
import { useRestaurants } from '@/hooks/useRestaurants';
import CategoryBar from '@/components/CategoryBar';
import ProfileCompletionPrompt from '@/components/ProfileCompletionPrompt';
import LoadingScreen from '@/components/LoadingScreen';
import BottomNav from '@/components/BottomNav';
import NotificationTrayTrigger from '@/components/NotificationTrayTrigger';
import HomeHeroSearch from '@/features/home-discovery/components/HomeHeroSearch';
import { HomeSearchSuggestionItem } from '@/features/home-discovery/components/HomeHeroSearch';
import IntentChipsBar from '@/features/home-discovery/components/IntentChipsBar';
import RestaurantRail from '@/features/home-discovery/components/RestaurantRail';
import {
    DiscoveryIntent,
    HomeFiltersState,
    HomePreferenceHints,
    HomeSortOption,
    ViewedRestaurantSignal
} from '@/features/home-discovery/types';
import { useHomeRails } from '@/features/home-discovery/hooks/useHomeRails';
import { useHomeAddressRecovery } from '@/features/home-discovery/hooks/useHomeAddressRecovery';
import { emitHomeEvent } from '@/features/home-discovery/analytics';
import { buildPreferenceHints, getViewedRestaurantsHistory, trackViewedRestaurant } from '@/features/home-discovery/utils/discoveryStorage';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

const AddressDetailsModal = dynamic(() => import('@/components/AddressDetailsModal'));
const ActivityFeed = dynamic(() => import('@/features/social/components/ActivityFeed'));
const LoyaltyWidget = dynamic(() => import('@/features/gamification/components/LoyaltyWidget'));
const StoryMenuFeed = dynamic(() => import('@/features/content/components/StoryMenuFeed'));
const DynamicPromoBanner = dynamic(() => import('@/features/home-discovery/components/DynamicPromoBanner'));

const HomeDiscoveryWidget = dynamic(
    () => import('@/features/home-discovery/components/HomeDiscoveryWidget'),
    { ssr: false }
);

const SurpriseMeWidget = dynamic(
    () => import('@/features/home-discovery/components/SurpriseMeWidget'),
    { ssr: false }
);

const PredictivePrompt = dynamic(
    () => import('@/features/home-discovery/components/PredictivePrompt'),
    { ssr: false }
);

const INTENT_OPTIONS: Array<{ id: DiscoveryIntent; labelKey: string }> = [
    { id: 'promotions', labelKey: 'intents.promotions' },
    { id: 'fast', labelKey: 'intents.fast' },
    { id: 'best_rated', labelKey: 'intents.bestRated' },
    { id: 'cheap', labelKey: 'intents.cheap' },
    { id: 'family_combo', labelKey: 'intents.familyCombo' },
    { id: 'healthy', labelKey: 'intents.healthy' }
];

const HOME_FILTERS_SORT_SESSION_KEY = 'home_filters_sort_state_v1';

const DEFAULT_HOME_FILTERS: HomeFiltersState = {
    price_band: null,
    eta_max: null,
    rating_min: null,
    delivery_fee_max: null,
    promotions_only: false
};

const FILTER_CHIPS: Array<{ key: keyof HomeFiltersState; labelKey: string; value: HomeFiltersState[keyof HomeFiltersState] }> = [
    { key: 'price_band', labelKey: 'filters.budget', value: 'budget' },
    { key: 'eta_max', labelKey: 'filters.eta', value: 30 },
    { key: 'rating_min', labelKey: 'filters.rating', value: 4.5 },
    { key: 'delivery_fee_max', labelKey: 'filters.deliveryFee', value: 1000 },
    { key: 'promotions_only', labelKey: 'filters.promosOnly', value: true }
];

const SORT_OPTIONS: Array<{ value: HomeSortOption; labelKey: string }> = [
    { value: 'best_value', labelKey: 'filters.sort.bestValue' },
    { value: 'fastest', labelKey: 'filters.sort.fastest' },
    { value: 'top_rated', labelKey: 'filters.sort.topRated' },
    { value: 'closest', labelKey: 'filters.sort.closest' }
];

const SEARCH_SUGGESTION_DEBOUNCE_MS = 280;
const MAX_VISIBLE_SUGGESTIONS = 8;
const MAX_RECOVERY_ALTERNATIVES = 3;
const MAX_RECOVERY_CATEGORIES = 4;

function normalizeSearchValue(value: string): string {
    return value.trim().toLowerCase();
}

function getInitialViewedHistory(): ViewedRestaurantSignal[] {
    if (typeof window === 'undefined') {
        return [];
    }

    return getViewedRestaurantsHistory();
}

function getInitialPreferenceHints(): HomePreferenceHints {
    const initialHistory = getInitialViewedHistory();
    return buildPreferenceHints(initialHistory);
}

function getInitialHomeFilterSortState(): { filters: HomeFiltersState; sortBy: HomeSortOption } {
    if (typeof window === 'undefined') {
        return {
            filters: DEFAULT_HOME_FILTERS,
            sortBy: 'best_value',
        };
    }

    const stored = window.sessionStorage.getItem(HOME_FILTERS_SORT_SESSION_KEY);
    if (!stored) {
        return {
            filters: DEFAULT_HOME_FILTERS,
            sortBy: 'best_value',
        };
    }

    try {
        const parsed = JSON.parse(stored) as { filters?: HomeFiltersState; sortBy?: HomeSortOption };
        return {
            filters: parsed.filters ? { ...DEFAULT_HOME_FILTERS, ...parsed.filters } : DEFAULT_HOME_FILTERS,
            sortBy: parsed.sortBy ?? 'best_value',
        };
    } catch {
        window.sessionStorage.removeItem(HOME_FILTERS_SORT_SESSION_KEY);
        return {
            filters: DEFAULT_HOME_FILTERS,
            sortBy: 'best_value',
        };
    }
}

export default function HomePage() {
    const t = useTranslations('home');
    const {
        userLocation,
        customerName,
        fromNumber,
        customerAddress,
        isAuthenticated,
        profilePromptDismissedAt,
        setCustomerAddress,
        setOnboarded,
        setProfilePromptDismissedAt
    } = useCartStore();
    const router = useRouter();
    const isLegacyListLayout = false;
    const isVisualHierarchyV2Enabled = true;
    const isStatePolishV1Enabled = true;
    const isSearchSuggestionsV1Enabled = process.env.NEXT_PUBLIC_HOME_SEARCH_SUGGESTIONS_V1?.toLowerCase() !== 'false';
    const isSurpriseMeEnabled = process.env.NEXT_PUBLIC_HOME_SURPRISE_ME?.toLowerCase() !== 'false';
    const isPredictiveReorderEnabled = process.env.NEXT_PUBLIC_HOME_PREDICTIVE_REORDER?.toLowerCase() !== 'false';
    const isStoryMenusEnabled = process.env.NEXT_PUBLIC_HOME_STORY_MENUS?.toLowerCase() !== 'false';
    const isFriendsActivityEnabled = process.env.NEXT_PUBLIC_HOME_FRIENDS_ACTIVITY?.toLowerCase() !== 'false';
    const initialFilterSortState = React.useMemo(() => getInitialHomeFilterSortState(), []);
    const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeIntent, setActiveIntent] = useState<DiscoveryIntent | null>(null);
    const [nonCriticalRailsReadyKey, setNonCriticalRailsReadyKey] = useState<string | null>(null);
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<HomeSearchSuggestionItem[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionImpressionQuery, setSuggestionImpressionQuery] = useState('');
    const [filters, setFilters] = useState<HomeFiltersState>(initialFilterSortState.filters);
    const [sortBy, setSortBy] = useState<HomeSortOption>(initialFilterSortState.sortBy);
    const [viewedHistory, setViewedHistory] = useState<ViewedRestaurantSignal[]>(getInitialViewedHistory);
    const [preferenceHints, setPreferenceHints] = useState<HomePreferenceHints>(getInitialPreferenceHints);
    const beginSuggestionFetch = React.useEffectEvent(() => {
        setSuggestionsLoading(true);
        setShowSuggestions(true);
    });

    const {
        addressInitialPosition,
        handleDismissProfilePrompt,
        handleOpenProfileCompletion,
        handleSaveAddress,
        isAddressModalOpen,
        setIsAddressModalOpen,
    } = useHomeAddressRecovery({
        isAuthenticated,
        customerName,
        fromNumber,
        customerAddress,
        userLocation,
        setCustomerAddress,
        setOnboarded,
        setProfilePromptDismissedAt,
        t,
    });

    const railLabels = React.useMemo(() => ({
        promosTitle: t('rails.promos.title'),
        promosSubtitleWithPromos: t('rails.promos.subtitleWithPromos'),
        promosSubtitleWithoutPromos: t('rails.promos.subtitleWithoutPromos'),
        bestQualityTitle: t('rails.bestQuality.title'),
        bestQualitySubtitle: t('rails.bestQuality.subtitle'),
        nearestTitle: t('rails.nearest.title'),
        nearestSubtitle: t('rails.nearest.subtitle'),
        bestValueNearYouTitle: t('rails.bestValueNearYou.title'),
        bestValueNearYouSubtitle: t('rails.bestValueNearYou.subtitle'),
        popularNowTitle: t('rails.popularNow.title'),
        popularNowSubtitle: t('rails.popularNow.subtitle'),
        combosUnderBudgetTitle: t('rails.combosUnderBudget.title'),
        combosUnderBudgetSubtitle: t('rails.combosUnderBudget.subtitle'),
        lowDeliveryFeeTitle: t('rails.lowDeliveryFee.title'),
        lowDeliveryFeeSubtitle: t('rails.lowDeliveryFee.subtitle'),
        continueExploringTitle: t('rails.continueExploring.title'),
        continueExploringSubtitle: t('rails.continueExploring.subtitle'),
        recentlyViewedTitle: t('rails.recentlyViewed.title'),
        recentlyViewedSubtitle: t('rails.recentlyViewed.subtitle'),
        forYouTitle: t('rails.forYou.title'),
        forYouSubtitle: t('rails.forYou.subtitle')
    }), [t]);

    const { categories, loading: categoriesLoading } = useCategories();

    // Memoize options to prevent infinite re-render loops
    const restaurantOptions = React.useMemo(() => ({
        categoryId: selectedCategoryId,
        userLocation
    }), [selectedCategoryId, userLocation]);

    const {
        restaurants,
        loading: restaurantsLoading,
        error: restaurantsError,
        refetch: refetchRestaurants,
        fetchSuggestions
    } = useRestaurants(restaurantOptions);

    useEffect(() => {
        emitHomeEvent({ name: 'home_view' });
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.sessionStorage.setItem(
            HOME_FILTERS_SORT_SESSION_KEY,
            JSON.stringify({ filters, sortBy })
        );
    }, [filters, sortBy]);

    const clearSearch = React.useCallback(() => {
        setSearchQuery('');
        setShowSuggestions(false);
        setSuggestions([]);
        setSuggestionImpressionQuery('');
    }, []);

    const clearFilters = React.useCallback(() => {
        setSearchQuery('');
        setSelectedCategoryId(null);
        setActiveIntent(null);
    }, []);

    const toggleFilterChip = React.useCallback((key: keyof HomeFiltersState, value: HomeFiltersState[keyof HomeFiltersState]) => {
        setFilters((prev) => {
            const nextValue = prev[key] === value ? DEFAULT_HOME_FILTERS[key] : value;
            const next = {
                ...prev,
                [key]: nextValue
            };

            emitHomeEvent({
                name: 'home_filter_apply',
                filter_key: key,
                filter_value: typeof nextValue === 'boolean' ? nextValue : String(nextValue ?? 'none')
            });

            return next;
        });
    }, []);

    const handleClearAllFilters = React.useCallback(() => {
        setFilters(DEFAULT_HOME_FILTERS);
        setSortBy('best_value');
        emitHomeEvent({ name: 'home_filter_clear' });
    }, []);

    const handleSortChange = React.useCallback((nextSort: HomeSortOption) => {
        setSortBy(nextSort);
        emitHomeEvent({ name: 'home_sort_change', sort_by: nextSort });
    }, []);

    // Filter restaurants by search query
    const filteredRestaurants = React.useMemo(() => restaurants.filter((restaurant) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            restaurant.name.toLowerCase().includes(query) ||
            restaurant.categories?.some(c => c.name.toLowerCase().includes(query))
        );
    }), [restaurants, searchQuery]);

    const searchQueryNormalized = React.useMemo(() => normalizeSearchValue(searchQuery), [searchQuery]);

    const hasNoSearchResults = Boolean(
        searchQueryNormalized &&
        filteredRestaurants.length === 0 &&
        !restaurantsLoading &&
        !restaurantsError
    );

    const recoveryAlternatives = React.useMemo(() => {
        if (!hasNoSearchResults) {
            return [];
        }

        return [...restaurants]
            .sort((left, right) => {
                const leftDistance = left.distance ?? Number.POSITIVE_INFINITY;
                const rightDistance = right.distance ?? Number.POSITIVE_INFINITY;
                if (leftDistance !== rightDistance) {
                    return leftDistance - rightDistance;
                }

                const leftEta = left.eta_min ?? Number.POSITIVE_INFINITY;
                const rightEta = right.eta_min ?? Number.POSITIVE_INFINITY;
                return leftEta - rightEta;
            })
            .slice(0, MAX_RECOVERY_ALTERNATIVES)
            .map((restaurant) => ({ id: restaurant.id, label: restaurant.name }));
    }, [hasNoSearchResults, restaurants]);

    const recoveryCategories = React.useMemo(() => {
        if (!hasNoSearchResults) {
            return [];
        }

        const categoryFrequency = new Map<string, number>();
        restaurants.forEach((restaurant) => {
            restaurant.categories.forEach((category) => {
                categoryFrequency.set(category.name, (categoryFrequency.get(category.name) ?? 0) + 1);
            });
        });

        return [...categoryFrequency.entries()]
            .sort((left, right) => right[1] - left[1])
            .slice(0, MAX_RECOVERY_CATEGORIES)
            .map(([label], index) => ({ id: `popular-category-${index + 1}`, label }));
    }, [hasNoSearchResults, restaurants]);

    const isProfileIncomplete = React.useMemo(() => (
        !customerName.trim() || !fromNumber.trim() || !customerAddress?.urlAddress
    ), [customerAddress?.urlAddress, customerName, fromNumber]);

    const shouldShowProfilePrompt = React.useMemo(() => {
        if (!isProfileIncomplete) {
            return false;
        }

        return !profilePromptDismissedAt;
    }, [isProfileIncomplete, profilePromptDismissedAt]);

    const hasTrackedProfilePromptImpression = React.useRef(false);
    useEffect(() => {
        if (!shouldShowProfilePrompt || hasTrackedProfilePromptImpression.current) {
            return;
        }

        emitHomeEvent({ name: 'profile_prompt_impression' });
        hasTrackedProfilePromptImpression.current = true;
    }, [shouldShowProfilePrompt]);

    useEffect(() => {
        if (!shouldShowProfilePrompt) {
            hasTrackedProfilePromptImpression.current = false;
        }
    }, [shouldShowProfilePrompt]);

    const rails = useHomeRails({
        restaurants: filteredRestaurants,
        activeIntent,
        filters,
        sortBy,
        personalizedEnabled: true,
        isReturningSession: true,
        viewedHistory,
        preferenceHints,
        railLabels
    });

    const isPersonalizedRail = React.useCallback(
        (railId: string) => railId === 'recently-viewed' || railId === 'for-you',
        []
    );

    const handleRestaurantOpen = React.useCallback(
        (railId: string) => (restaurant: typeof restaurants[number], rank: number) => {
            emitHomeEvent({
                name: 'rail_item_click',
                rail_id: railId,
                restaurant_id: restaurant.id,
                rank
            });

            if (isPersonalizedRail(railId)) {
                emitHomeEvent({
                    name: 'personalized_rail_item_click',
                    rail_id: railId,
                    restaurant_id: restaurant.id,
                    rank
                });
            }

            const updatedHistory = trackViewedRestaurant(restaurant);
            setViewedHistory(updatedHistory);
            setPreferenceHints(buildPreferenceHints(updatedHistory));
        },
        [isPersonalizedRail]
    );

    useEffect(() => {
        if (!searchQuery.trim()) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            emitHomeEvent({ name: 'home_search_input', query_length: searchQuery.trim().length });
        }, 350);

        return () => window.clearTimeout(timeoutId);
    }, [searchQuery]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, SEARCH_SUGGESTION_DEBOUNCE_MS);

        return () => window.clearTimeout(timeoutId);
    }, [searchQuery]);

    useEffect(() => {
        if (!isSearchSuggestionsV1Enabled) {
            return;
        }

        const normalizedQuery = normalizeSearchValue(debouncedSearchQuery);
        if (normalizedQuery.length < 2) {
            return;
        }

        const controller = new AbortController();
        beginSuggestionFetch();

        fetchSuggestions(normalizedQuery, controller.signal)
            .then((matchedRestaurants) => {
                const restaurantSuggestions: HomeSearchSuggestionItem[] = matchedRestaurants
                    .slice(0, MAX_VISIBLE_SUGGESTIONS)
                    .map((restaurant) => ({
                        id: `restaurant-${restaurant.id}`,
                        label: restaurant.name,
                        kind: 'restaurant'
                    }));

                const seenCategories = new Set<string>();
                const categorySuggestions: HomeSearchSuggestionItem[] = [];

                matchedRestaurants.forEach((restaurant) => {
                    restaurant.categories.forEach((category) => {
                        const categoryLabel = category.name.trim();
                        const normalizedCategory = normalizeSearchValue(categoryLabel);

                        if (!normalizedCategory.includes(normalizedQuery) || seenCategories.has(normalizedCategory)) {
                            return;
                        }

                        seenCategories.add(normalizedCategory);
                        categorySuggestions.push({
                            id: `category-${category.id}`,
                            label: categoryLabel,
                            kind: 'category'
                        });
                    });
                });

                const nextSuggestions = [...restaurantSuggestions, ...categorySuggestions].slice(0, MAX_VISIBLE_SUGGESTIONS);
                setSuggestions(nextSuggestions);

                if (nextSuggestions.length > 0 && suggestionImpressionQuery !== normalizedQuery) {
                    setSuggestionImpressionQuery(normalizedQuery);
                    emitHomeEvent({
                        name: 'home_search_suggestion_impression',
                        query_length: normalizedQuery.length,
                        suggestion_count: nextSuggestions.length
                    });
                }
            })
            .catch((error: unknown) => {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return;
                }

                setSuggestions([]);
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setSuggestionsLoading(false);
                }
            });

        return () => controller.abort();
    }, [debouncedSearchQuery, fetchSuggestions, isSearchSuggestionsV1Enabled, suggestionImpressionQuery]);

    const nonCriticalRailsKey = React.useMemo(
        () => `${activeIntent ?? 'all'}|${selectedCategoryId ?? 'all'}|${searchQuery}|${restaurants.length}`,
        [activeIntent, restaurants.length, searchQuery, selectedCategoryId]
    );

    const handleSuggestionSelect = React.useCallback((suggestion: HomeSearchSuggestionItem) => {
        const normalizedSuggestion = normalizeSearchValue(suggestion.label);
        setSearchQuery(suggestion.label);
        setShowSuggestions(false);

        if (suggestion.kind === 'category') {
            const matchedCategory = categories.find((category) => normalizeSearchValue(category.name) === normalizedSuggestion);
            if (matchedCategory) {
                setSelectedCategoryId(matchedCategory.id);
            }
        }

        emitHomeEvent({
            name: 'home_search_suggestion_select',
            suggestion_kind: suggestion.kind,
            query_length: normalizedSuggestion.length
        });
    }, [categories]);

    const handleRecoveryAlternativeSelect = React.useCallback((restaurantId: string) => {
        const selectedRestaurant = restaurants.find((restaurant) => restaurant.id === restaurantId);
        if (!selectedRestaurant) {
            return;
        }

        setSearchQuery(selectedRestaurant.name);
        setShowSuggestions(false);

        emitHomeEvent({
            name: 'home_search_no_results_recovery_click',
            action: 'alternative_restaurant',
            target: restaurantId
        });
    }, [restaurants]);

    const handleRecoveryCategorySelect = React.useCallback((categoryLabel: string) => {
        const normalizedCategory = normalizeSearchValue(categoryLabel);
        const matchedCategory = categories.find((category) => normalizeSearchValue(category.name) === normalizedCategory);
        if (matchedCategory) {
            setSelectedCategoryId(matchedCategory.id);
        }

        setSearchQuery(categoryLabel);
        setShowSuggestions(false);

        emitHomeEvent({
            name: 'home_search_no_results_recovery_click',
            action: 'popular_category',
            target: categoryLabel
        });
    }, [categories]);

    const handleRecoveryClearSearch = React.useCallback(() => {
        clearSearch();
        emitHomeEvent({
            name: 'home_search_no_results_recovery_click',
            action: 'clear_search',
            target: 'search_reset'
        });
    }, [clearSearch]);

    useEffect(() => {
        const globalWindow = window as typeof window & {
            requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
            cancelIdleCallback?: (id: number) => void;
        };

        if (typeof globalWindow.requestIdleCallback === 'function') {
            const idleId = globalWindow.requestIdleCallback(() => setNonCriticalRailsReadyKey(nonCriticalRailsKey), { timeout: 300 });

            return () => {
                if (typeof globalWindow.cancelIdleCallback === 'function') {
                    globalWindow.cancelIdleCallback(idleId);
                }
            };
        }

        const timeoutId = window.setTimeout(() => setNonCriticalRailsReadyKey(nonCriticalRailsKey), 120);
        return () => window.clearTimeout(timeoutId);
    }, [nonCriticalRailsKey]);

    const visibleRails = nonCriticalRailsReadyKey === nonCriticalRailsKey ? rails : rails.slice(0, 3);

    const dynamicRailEmptyVariant = React.useMemo(() => {
        if (searchQuery.trim()) {
            return 'query' as const;
        }

        if (activeIntent || selectedCategoryId) {
            return 'intent_or_filter' as const;
        }

        return 'default' as const;
    }, [activeIntent, searchQuery, selectedCategoryId]);

    const openBannerFallbackDiscovery = React.useCallback(() => {
        clearSearch();
        setActiveIntent(null);
        router.push('/search');
    }, [clearSearch, router]);

    if (categoriesLoading) {
        return <LoadingScreen />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="sticky top-0 z-40 bg-white shadow-sm">
                <HomeHeroSearch
                    hasActiveLocation={Boolean(userLocation)}
                    notificationTrigger={(
                        <NotificationTrayTrigger
                            analyticsSource="home_header_button"
                            buttonClassName="relative mt-0.5 h-12 w-12 rounded-2xl border-slate-200 bg-white shadow-sm"
                            badgeClassName="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-orange-600 px-1 text-[10px] font-bold text-white shadow-sm"
                            iconClassName="h-5 w-5"
                            onOpenTracking={() => router.push('/orders')}
                        />
                    )}
                    searchQuery={searchQuery}
                    onSearchQueryChange={(value) => {
                        setSearchQuery(value);
                        if (!value.trim()) {
                            setShowSuggestions(false);
                            return;
                        }

                        if (isSearchSuggestionsV1Enabled) {
                            setShowSuggestions(true);
                        }
                    }}
                    suggestions={suggestions}
                    suggestionsLoading={suggestionsLoading}
                    showSuggestions={isSearchSuggestionsV1Enabled && showSuggestions}
                    onSuggestionSelect={handleSuggestionSelect}
                    showRecovery={hasNoSearchResults}
                    recoveryAlternatives={recoveryAlternatives}
                    recoveryCategories={recoveryCategories}
                    onRecoveryAlternativeSelect={handleRecoveryAlternativeSelect}
                    onRecoveryCategorySelect={handleRecoveryCategorySelect}
                    onClearSearch={handleRecoveryClearSearch}
                    loyaltyWidget={<LoyaltyWidget />}
                    profilePrompt={(
                        <ProfileCompletionPrompt
                            visible={shouldShowProfilePrompt}
                            onCompleteNow={handleOpenProfileCompletion}
                            onLater={handleDismissProfilePrompt}
                        />
                    )}
                    visualHierarchyV2={isVisualHierarchyV2Enabled}
                />
            </div>

            {/* Header */}
            <header className="bg-white">
                {/* Category Bar */}
                <CategoryBar
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    onSelectCategory={(categoryId) => {
                        setSelectedCategoryId(categoryId);
                        emitHomeEvent({ name: 'category_filter_click', category_id: categoryId });
                    }}
                />

                {!isLegacyListLayout && (
                    <IntentChipsBar
                        intents={INTENT_OPTIONS.map((intent) => ({ id: intent.id, label: t(intent.labelKey) }))}
                        activeIntent={activeIntent}
                        showAllOption
                        allLabel={t('intents.all')}
                        onIntentChange={(intent) => {
                            setActiveIntent(intent);
                            if (intent) {
                                emitHomeEvent({ name: 'intent_chip_click', chip: intent });
                            }
                        }}
                        onOpenFilters={() => setIsFiltersModalOpen(true)}
                    >
                        {FILTER_CHIPS.map((chip) => {
                            const isActive = filters[chip.key] === chip.value;

                            return (
                                <button
                                    key={`${chip.key}-${String(chip.value)}`}
                                    type="button"
                                    onClick={() => toggleFilterChip(chip.key, chip.value)}
                                    className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1 ${isActive
                                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
                                        }`}
                                    aria-pressed={isActive}
                                >
                                    {t(chip.labelKey)}
                                </button>
                            );
                        })}
                    </IntentChipsBar>
                )}
            </header>

            {/* Main Content */}
            <main className="px-4 py-6">
                <DynamicPromoBanner
                    onPromoClick={() => {
                        clearSearch();
                        setSelectedCategoryId(null);
                        setActiveIntent('promotions');
                        router.push('/search');
                    }}
                />

                {isPredictiveReorderEnabled && (
                    <PredictivePrompt
                        onReorderClick={(restaurantId) => {
                            const selectedRestaurant = restaurants.find((restaurant) => restaurant.id === restaurantId);
                            if (selectedRestaurant?.slug) {
                                router.push(`/${selectedRestaurant.slug}`);
                                return true;
                            }

                            emitHomeEvent({
                                name: 'home_banner_fallback_shown',
                                banner_id: 'predictive',
                                fallback_type: 'missing_target'
                            });

                            openBannerFallbackDiscovery();
                            return false;
                        }}
                        onFallbackClick={() => {
                            openBannerFallbackDiscovery();
                        }}
                    />
                )}

                {isStoryMenusEnabled && (
                    <div className="mt-2">
                        <StoryMenuFeed />
                    </div>
                )}

                {isFriendsActivityEnabled && <ActivityFeed />}

                {isSurpriseMeEnabled && (
                    <SurpriseMeWidget
                        onRecommendationClick={(restaurantId) => {
                            const selectedRestaurant = restaurants.find((restaurant) => restaurant.id === restaurantId);
                            if (selectedRestaurant?.slug) {
                                router.push(`/${selectedRestaurant.slug}`);
                            }
                        }}
                    />
                )}

                {visibleRails.map((rail) => (
                    <RestaurantRail
                        key={rail.railId}
                        railId={rail.railId}
                        title={rail.title}
                        subtitle={rail.subtitle}
                        restaurants={rail.items}
                        loading={restaurantsLoading}
                        error={restaurantsError}
                        onRetry={refetchRestaurants}
                        onErrorFallback={clearFilters}
                        onEmptyAction={searchQuery.trim() ? clearSearch : clearFilters}
                        emptyVariant={dynamicRailEmptyVariant}
                        onRestaurantOpen={handleRestaurantOpen(rail.railId)}
                        visualHierarchyV2={isVisualHierarchyV2Enabled}
                        statePolishV1={isStatePolishV1Enabled}
                        personalizedRail={isPersonalizedRail(rail.railId)}
                    />
                ))}
            </main>

            <HomeDiscoveryWidget
                enabled
                location={userLocation ? { lat: userLocation.lat, lng: userLocation.lng, precision: 'coarse' } : undefined}
                onRecommendationClick={(restaurantId) => {
                    const selectedRestaurant = restaurants.find((restaurant) => restaurant.id === restaurantId);
                    if (selectedRestaurant?.slug) {
                        router.push(`/${selectedRestaurant.slug}`);
                    }
                }}
            />

            <AddressDetailsModal
                isOpen={isAddressModalOpen}
                initialValue={customerAddress ?? undefined}
                initialPosition={addressInitialPosition}
                onClose={() => setIsAddressModalOpen(false)}
                onBack={() => {
                    setIsAddressModalOpen(false);
                    router.push('/profile');
                }}
                onSave={handleSaveAddress}
                onPermissionRequested={() => emitHomeEvent({ name: 'location_permission_request' })}
                onPermissionGranted={() => emitHomeEvent({ name: 'location_permission_granted' })}
                onPermissionDenied={() => emitHomeEvent({ name: 'location_permission_denied' })}
            />

            <BottomNav />

            {isFiltersModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
                    <div className="w-full max-w-md rounded-t-2xl bg-white p-4 sm:rounded-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">{t('filters.title')}</h2>
                            <button
                                type="button"
                                onClick={() => setIsFiltersModalOpen(false)}
                                className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="home-sort-control-modal" className="mb-2 block text-sm font-medium text-gray-700">
                                    {t('filters.sortBy')}
                                </label>
                                <select
                                    id="home-sort-control-modal"
                                    value={sortBy}
                                    onChange={(event) => handleSortChange(event.target.value as HomeSortOption)}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                                >
                                    {SORT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {t(option.labelKey)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleClearAllFilters();
                                        setIsFiltersModalOpen(false);
                                    }}
                                    className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    {t('filters.clearAll')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
