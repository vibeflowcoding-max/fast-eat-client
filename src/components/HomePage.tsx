"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { useCartStore } from '@/store';
import { useCategories } from '@/hooks/useCategories';
import { useRestaurants } from '@/hooks/useRestaurants';
import CategoryBar from '@/components/CategoryBar';
import ProfileCompletionPrompt from '@/components/ProfileCompletionPrompt';
import ProfileCompletionModal from '@/components/ProfileCompletionModal';
import AddressDetailsModal, { BuildingType } from '@/components/AddressDetailsModal';
import LoadingScreen from '@/components/LoadingScreen';
import BottomNav from '@/components/BottomNav';
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
import { emitHomeEvent } from '@/features/home-discovery/analytics';
import { buildPreferenceHints, getViewedRestaurantsHistory, trackViewedRestaurant } from '@/features/home-discovery/utils/discoveryStorage';
import dynamic from 'next/dynamic';
import ActivityFeed from '@/features/social/components/ActivityFeed';
import LoyaltyWidget from '@/features/gamification/components/LoyaltyWidget';
import StoryMenuFeed from '@/features/content/components/StoryMenuFeed';
import DynamicPromoBanner from '@/features/home-discovery/components/DynamicPromoBanner';
import { useTranslations } from 'next-intl';

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

export default function HomePage() {
    const t = useTranslations('home');
    const {
        userLocation,
        customerName,
        fromNumber,
        customerAddress,
        profilePromptDismissedAt,
        setCustomerName,
        setFromNumber,
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
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
    const [locationRequestLoading, setLocationRequestLoading] = useState(false);
    const [locationPermissionError, setLocationPermissionError] = useState<string | null>(null);
    const [addressInitialPosition, setAddressInitialPosition] = useState<{ lat: number; lng: number } | null>(userLocation ?? null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeIntent, setActiveIntent] = useState<DiscoveryIntent | null>(null);
    const [showNonCriticalRails, setShowNonCriticalRails] = useState(false);
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<HomeSearchSuggestionItem[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionImpressionQuery, setSuggestionImpressionQuery] = useState('');
    const [filters, setFilters] = useState<HomeFiltersState>(DEFAULT_HOME_FILTERS);
    const [sortBy, setSortBy] = useState<HomeSortOption>('best_value');
    const [viewedHistory, setViewedHistory] = useState<ViewedRestaurantSignal[]>([]);
    const [preferenceHints, setPreferenceHints] = useState<HomePreferenceHints>({ categoryWeights: {} });

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
        const history = getViewedRestaurantsHistory();
        setViewedHistory(history);
        setPreferenceHints(buildPreferenceHints(history));
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const stored = window.sessionStorage.getItem(HOME_FILTERS_SORT_SESSION_KEY);
        if (!stored) {
            return;
        }

        try {
            const parsed = JSON.parse(stored) as { filters?: HomeFiltersState; sortBy?: HomeSortOption };
            if (parsed.filters) {
                setFilters({ ...DEFAULT_HOME_FILTERS, ...parsed.filters });
            }

            if (parsed.sortBy) {
                setSortBy(parsed.sortBy);
            }
        } catch {
            window.sessionStorage.removeItem(HOME_FILTERS_SORT_SESSION_KEY);
        }
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
    const filteredRestaurants = restaurants.filter((restaurant) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            restaurant.name.toLowerCase().includes(query) ||
            restaurant.categories?.some(c => c.name.toLowerCase().includes(query))
        );
    });

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

    const loadedAddressForPhoneRef = React.useRef<string | null>(null);
    useEffect(() => {
        const normalizedPhone = fromNumber.trim();
        if (!normalizedPhone || customerAddress || loadedAddressForPhoneRef.current === normalizedPhone) {
            return;
        }

        const controller = new AbortController();

        fetch(`/api/customer/address?phone=${encodeURIComponent(normalizedPhone)}`, { signal: controller.signal })
            .then(async (response) => {
                if (!response.ok) {
                    return null;
                }

                return response.json();
            })
            .then((data) => {
                loadedAddressForPhoneRef.current = normalizedPhone;

                if (!data?.address) {
                    return;
                }

                setCustomerAddress({
                    customerId: data.address.customer_id,
                    urlAddress: data.address.url_address,
                    buildingType: data.address.building_type,
                    unitDetails: data.address.unit_details ?? undefined,
                    deliveryNotes: data.address.delivery_notes,
                    lat: typeof data.address.lat === 'number' ? data.address.lat : undefined,
                    lng: typeof data.address.lng === 'number' ? data.address.lng : undefined,
                    formattedAddress: typeof data.address.formatted_address === 'string' ? data.address.formatted_address : undefined,
                    placeId: typeof data.address.place_id === 'string' ? data.address.place_id : undefined,
                });

                if (typeof data.address.lat === 'number' && typeof data.address.lng === 'number') {
                    const recoveredPosition = { lat: data.address.lat, lng: data.address.lng };
                    useCartStore.getState().setUserLocation(recoveredPosition);
                    setAddressInitialPosition(recoveredPosition);
                }
            })
            .catch(() => {
                loadedAddressForPhoneRef.current = normalizedPhone;
            });

        return () => controller.abort();
    }, [customerAddress, fromNumber, setCustomerAddress]);

    const handleOpenProfileCompletion = React.useCallback(() => {
        setIsProfileModalOpen(true);
        emitHomeEvent({ name: 'profile_prompt_click' });
    }, []);

    const handleDismissProfilePrompt = React.useCallback(() => {
        setProfilePromptDismissedAt(Date.now());
        emitHomeEvent({ name: 'profile_prompt_dismiss' });
    }, [setProfilePromptDismissedAt]);

    const handleProfileContinue = React.useCallback(async (value: { name: string; phone: string }) => {
        const response = await fetch('/api/customer/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(value)
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.error || t('errors.saveProfile'));
        }

        setCustomerName(value.name);
        setFromNumber(value.phone);
        setOnboarded(true);

        if (!isProfileIncomplete) {
            setProfilePromptDismissedAt(null);
        }
    }, [isProfileIncomplete, setCustomerName, setFromNumber, setOnboarded, setProfilePromptDismissedAt, t]);

    const handleRequestLocationFromProfile = React.useCallback(() => {
        if (!navigator.geolocation) {
            setLocationPermissionError(t('errors.geolocationUnsupported'));
            setIsAddressModalOpen(true);
            return;
        }

        emitHomeEvent({ name: 'location_permission_request' });
        setLocationRequestLoading(true);
        setLocationPermissionError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const nextPosition = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                setAddressInitialPosition(nextPosition);
                useCartStore.getState().setUserLocation(nextPosition);
                setIsAddressModalOpen(true);
                emitHomeEvent({ name: 'location_permission_granted' });
                setLocationRequestLoading(false);
            },
            () => {
                setLocationPermissionError(t('errors.permissionDenied'));
                setIsAddressModalOpen(true);
                emitHomeEvent({ name: 'location_permission_denied' });
                setLocationRequestLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }, [t]);

    const handleSaveAddress = React.useCallback(async (value: {
        urlAddress: string;
        buildingType: BuildingType;
        unitDetails?: string;
        deliveryNotes: string;
        lat?: number;
        lng?: number;
        formattedAddress?: string;
        placeId?: string;
    }) => {
        emitHomeEvent({ name: 'address_form_save_click' });

        if (!fromNumber.trim() || !customerName.trim()) {
            setIsAddressModalOpen(false);
            setLocationPermissionError(t('errors.namePhoneRequired'));
            setIsProfileModalOpen(true);
            throw new Error(t('errors.namePhoneRequiredAddress'));
        }

        const payload = {
            phone: fromNumber.trim(),
            fullName: customerName.trim(),
            ...value
        };

        const response = await fetch('/api/customer/address', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            emitHomeEvent({ name: 'address_form_save_error' });
            const errorPayload = await response.json().catch(() => null);
            throw new Error(errorPayload?.error || t('errors.saveAddress'));
        }

        const data = await response.json();
        setCustomerAddress({
            customerId: data.address?.customer_id,
            urlAddress: value.urlAddress,
            buildingType: value.buildingType,
            unitDetails: value.unitDetails,
            deliveryNotes: value.deliveryNotes,
            lat: value.lat,
            lng: value.lng,
            formattedAddress: value.formattedAddress,
            placeId: value.placeId,
        });
        setProfilePromptDismissedAt(null);
        setOnboarded(true);
        emitHomeEvent({ name: 'address_form_save_success' });

        setIsAddressModalOpen(false);
        setIsProfileModalOpen(true);
    }, [customerName, fromNumber, setCustomerAddress, setOnboarded, setProfilePromptDismissedAt, t]);

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
        [isPersonalizedRail, restaurants]
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
            setSuggestions([]);
            setSuggestionsLoading(false);
            setShowSuggestions(false);
            setSuggestionImpressionQuery('');
            return;
        }

        const controller = new AbortController();
        setSuggestionsLoading(true);
        setShowSuggestions(true);

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
        setShowNonCriticalRails(false);

        const globalWindow = window as typeof window & {
            requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
            cancelIdleCallback?: (id: number) => void;
        };

        if (typeof globalWindow.requestIdleCallback === 'function') {
            const idleId = globalWindow.requestIdleCallback(() => setShowNonCriticalRails(true), { timeout: 300 });

            return () => {
                if (typeof globalWindow.cancelIdleCallback === 'function') {
                    globalWindow.cancelIdleCallback(idleId);
                }
            };
        }

        const timeoutId = window.setTimeout(() => setShowNonCriticalRails(true), 120);
        return () => window.clearTimeout(timeoutId);
    }, [activeIntent, searchQuery, selectedCategoryId, restaurants.length]);

    const visibleRails = showNonCriticalRails ? rails : rails.slice(0, 3);

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

                <ActivityFeed />

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

            <ProfileCompletionModal
                isOpen={isProfileModalOpen}
                initialName={customerName}
                initialPhone={fromNumber}
                hasConfiguredAddress={Boolean(customerAddress?.urlAddress)}
                locationRequestLoading={locationRequestLoading}
                locationPermissionError={locationPermissionError}
                onRequestLocation={handleRequestLocationFromProfile}
                onEnterAddressManually={({ name, phone }) => {
                    setCustomerName(name);
                    setFromNumber(phone);
                    setLocationPermissionError(null);
                    setIsProfileModalOpen(false);
                    setIsAddressModalOpen(true);
                }}
                onContinue={handleProfileContinue}
                onLater={() => {
                    setIsProfileModalOpen(false);
                    setProfilePromptDismissedAt(Date.now());
                    emitHomeEvent({ name: 'profile_prompt_dismiss' });
                }}
                onClose={() => {
                    setIsProfileModalOpen(false);
                }}
            />

            <AddressDetailsModal
                isOpen={isAddressModalOpen}
                initialValue={customerAddress ?? undefined}
                initialPosition={addressInitialPosition}
                onClose={() => setIsAddressModalOpen(false)}
                onBack={() => {
                    setIsAddressModalOpen(false);
                    setIsProfileModalOpen(true);
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
