import { HomeFeatureFlags } from './types';

function parseFlag(value: string | undefined, fallback: boolean) {
    if (value === undefined) {
        return fallback;
    }

    return value.toLowerCase() === 'true';
}

export function getHomeFeatureFlags(): HomeFeatureFlags {
    return {
        home_intent_rails: parseFlag(process.env.NEXT_PUBLIC_HOME_INTENT_RAILS, true),
        home_price_compare: parseFlag(process.env.NEXT_PUBLIC_HOME_PRICE_COMPARE, true),
        home_discovery_chat: parseFlag(process.env.NEXT_PUBLIC_HOME_DISCOVERY_CHAT, true),
        home_visual_hierarchy_v2: parseFlag(process.env.NEXT_PUBLIC_HOME_VISUAL_HIERARCHY_V2, false),
        home_state_polish_v1: parseFlag(process.env.NEXT_PUBLIC_HOME_STATE_POLISH_V1, false),
        home_filters_sort_v1: parseFlag(process.env.NEXT_PUBLIC_HOME_FILTERS_SORT_V1, false),
        home_personalized_rails_v1: parseFlag(process.env.NEXT_PUBLIC_HOME_PERSONALIZED_RAILS_V1, false),
        home_search_suggestions_v1: parseFlag(process.env.NEXT_PUBLIC_HOME_SEARCH_SUGGESTIONS_V1, true),
        home_surprise_me: parseFlag(process.env.NEXT_PUBLIC_HOME_SURPRISE_ME, false),
        home_dietary_guardian: parseFlag(process.env.NEXT_PUBLIC_HOME_DIETARY_GUARDIAN, false),
        home_predictive_reorder: parseFlag(process.env.NEXT_PUBLIC_HOME_PREDICTIVE_REORDER, false)
    };
}
