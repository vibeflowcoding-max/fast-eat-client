import { RestaurantWithBranches } from '@/types';

export type DiscoveryIntent = 'cheap' | 'fast' | 'healthy' | 'family_combo' | 'promotions' | 'best_rated';
export type RecommendationKind = 'restaurant' | 'combo' | 'dish' | 'deal';
export type HomePriceBand = 'budget' | 'mid' | 'premium';
export type HomeSortOption = 'best_value' | 'fastest' | 'top_rated' | 'closest';

export interface HomeFiltersState {
    price_band: HomePriceBand | null;
    eta_max: number | null;
    rating_min: number | null;
    delivery_fee_max: number | null;
    promotions_only: boolean;
}

export interface ViewedRestaurantSignal {
    restaurantId: string;
    viewedAt: number;
    categories: string[];
    etaMinutes?: number | null;
    finalPriceEstimate?: number | null;
}

export interface HomePreferenceHints {
    categoryWeights: Record<string, number>;
    preferredEtaMax?: number;
    preferredPriceMax?: number;
}

export interface UserConstraints {
    budgetMax?: number;
    partySize?: number;
    etaMaxMinutes?: number;
    dietary?: string[];
    cuisines?: string[];
    avoidIngredients?: string[];
}

export interface LocationContext {
    lat?: number;
    lng?: number;
    areaLabel?: string;
    precision?: 'exact' | 'coarse';
}

export interface RecommendationItem {
    kind: RecommendationKind;
    id: string;
    restaurantId: string;
    title: string;
    subtitle?: string;
    basePrice?: number;
    discountAmount?: number;
    finalPrice?: number;
    estimatedDeliveryFee?: number;
    etaMin?: number;
    score: number;
    reasons: string[];
    tags?: string[];
}

export interface ChatHistoryItem {
    role: 'user' | 'assistant';
    content: string;
}

export interface DiscoveryChatRequest {
    sessionId: string;
    userId?: string;
    locale: string;
    query: string;
    history: ChatHistoryItem[];
    location?: LocationContext;
    constraints?: UserConstraints;
    surface: 'home';
}

export interface CompareOption {
    restaurantId: string;
    label: string;
    basePrice: number;
    deliveryFee: number;
    platformFee: number;
    discount: number;
    finalPrice: number;
    etaMin?: number;
}

export interface CompareOptions {
    title: string;
    options: CompareOption[];
}

export interface DiscoveryChatResponse {
    answer: string;
    recommendations: RecommendationItem[];
    followUps: string[];
    compareOptions?: CompareOptions;
    traceId: string;
}

export interface DiscoveryRecommendationsRequest {
    location?: LocationContext;
    constraints?: UserConstraints;
    intent?: DiscoveryIntent;
    limit?: number;
}

export interface HomeRail {
    railId: string;
    title: string;
    subtitle?: string;
    items: RestaurantWithBranches[];
}

export interface DiscoveryRecommendationsResponse {
    rails: HomeRail[];
    generatedAt: string;
    strategyVersion: string;
}

export interface CompareRequest {
    items: Array<{ restaurantId: string; itemIds: string[] }>;
    location?: LocationContext;
}

export interface CompareResponse {
    comparison: CompareOptions;
    traceId: string;
    strategyVersion: string;
}

export interface HomeFeatureFlags {
    home_intent_rails: boolean;
    home_price_compare: boolean;
    home_discovery_chat: boolean;
    home_visual_hierarchy_v2: boolean;
    home_state_polish_v1: boolean;
    home_filters_sort_v1: boolean;
    home_personalized_rails_v1: boolean;
    home_search_suggestions_v1: boolean;
}

export interface HomeAnalyticsDimensions {
    experiment_id?: string;
    variant_id?: string;
    geo_bucket?: string;
    session_type?: 'new' | 'returning';
}

export type HomeAnalyticsEvent = HomeAnalyticsDimensions & (
    | { name: 'home_view' }
    | { name: 'intent_chip_click'; chip: DiscoveryIntent }
    | { name: 'home_search_input'; query_length: number }
    | { name: 'category_filter_click'; category_id: string | null }
    | { name: 'home_filter_apply'; filter_key: keyof HomeFiltersState; filter_value: string | number | boolean }
    | { name: 'home_filter_clear' }
    | { name: 'home_sort_change'; sort_by: HomeSortOption }
    | { name: 'personalized_rail_impression'; rail_id: string; item_count: number }
    | { name: 'personalized_rail_item_click'; rail_id: string; restaurant_id: string; rank: number }
    | { name: 'rail_impression'; rail_id: string; item_count: number }
    | { name: 'rail_item_click'; rail_id: string; restaurant_id: string; rank: number }
    | { name: 'rail_error_retry_click'; rail_id: string }
    | { name: 'rail_empty_state_action_click'; rail_id: string; action: 'clear_search' | 'clear_filters' | 'broaden_radius' | 'retry' }
    | { name: 'compare_open' | 'compare_select'; source: 'rail' | 'chat' }
    | { name: 'home_chat_open' | 'home_chat_query' | 'home_chat_recommendation_click'; trace_id?: string }
    | { name: 'home_chat_quick_prompt_click' | 'home_chat_followup_click'; label: string }
    | { name: 'home_search_suggestion_impression'; query_length: number; suggestion_count: number }
    | { name: 'home_search_suggestion_select'; suggestion_kind: 'restaurant' | 'category'; query_length: number }
    | { name: 'home_search_no_results_recovery_click'; action: 'alternative_restaurant' | 'popular_category' | 'clear_search'; target: string }
    | { name: 'profile_prompt_impression' | 'profile_prompt_click' | 'profile_prompt_dismiss' }
    | { name: 'location_permission_request' | 'location_permission_granted' | 'location_permission_denied' }
    | { name: 'address_form_save_click' | 'address_form_save_success' | 'address_form_save_error' }
);
