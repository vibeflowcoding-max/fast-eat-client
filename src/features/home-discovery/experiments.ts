import { HomeFeatureFlags } from './types';

const EXPERIMENT_ID_FALLBACK = 'home_discovery_variant_v1';
const VARIANT_STORAGE_KEY = 'home_discovery_variant_id';
const CANARY_ENROLLMENT_STORAGE_KEY = 'home_discovery_canary_enrolled';
const HOME_VISITED_STORAGE_KEY = 'home_discovery_seen_home';

const SUPPORTED_VARIANTS = [
    'control',
    'intent_first',
    'rails_only',
    'rails_assistant'
] as const;

export type HomeExperimentVariant = (typeof SUPPORTED_VARIANTS)[number];

export interface HomeExperimentContext {
    experiment_id: string;
    variant_id: HomeExperimentVariant;
    geo_bucket: string;
    session_type: 'new' | 'returning';
}

export type HomeLayoutMode = 'legacy_list' | 'intent_rails';

function isSupportedVariant(value: string): value is HomeExperimentVariant {
    return SUPPORTED_VARIANTS.includes(value as HomeExperimentVariant);
}

function parseVariantList(value: string | undefined): HomeExperimentVariant[] {
    if (!value) {
        return ['rails_assistant', 'rails_only'];
    }

    const parsed = value
        .split(',')
        .map((item) => item.trim())
        .filter((item): item is HomeExperimentVariant => isSupportedVariant(item));

    return parsed.length > 0 ? parsed : ['rails_assistant', 'rails_only'];
}

function parseCanaryPercent(value: string | undefined): number {
    const parsed = Number(value);

    if (Number.isNaN(parsed)) {
        return 100;
    }

    return Math.min(100, Math.max(0, parsed));
}

function getBaselineVariant(value: string | undefined): HomeExperimentVariant {
    if (value && isSupportedVariant(value)) {
        return value;
    }

    return 'control';
}

function isCanaryEnrolled(percent: number): boolean {
    if (typeof window === 'undefined') {
        return true;
    }

    const stored = window.localStorage.getItem(CANARY_ENROLLMENT_STORAGE_KEY);
    if (stored === '1') {
        return true;
    }

    if (stored === '0') {
        return false;
    }

    const enrolled = Math.random() * 100 < percent;
    window.localStorage.setItem(CANARY_ENROLLMENT_STORAGE_KEY, enrolled ? '1' : '0');

    return enrolled;
}

function getOrCreateVariant(variants: HomeExperimentVariant[]): HomeExperimentVariant {
    if (typeof window === 'undefined') {
        return variants[0] ?? 'rails_assistant';
    }

    const forcedVariant = process.env.NEXT_PUBLIC_HOME_EXPERIMENT_FORCE_VARIANT;
    if (forcedVariant && isSupportedVariant(forcedVariant)) {
        window.localStorage.setItem(VARIANT_STORAGE_KEY, forcedVariant);
        return forcedVariant;
    }

    const canaryPercent = parseCanaryPercent(process.env.NEXT_PUBLIC_HOME_EXPERIMENT_CANARY_PERCENT);
    const baselineVariant = getBaselineVariant(process.env.NEXT_PUBLIC_HOME_EXPERIMENT_BASELINE_VARIANT);

    if (!isCanaryEnrolled(canaryPercent)) {
        window.localStorage.setItem(VARIANT_STORAGE_KEY, baselineVariant);
        return baselineVariant;
    }

    const storedVariant = window.localStorage.getItem(VARIANT_STORAGE_KEY);
    if (storedVariant && isSupportedVariant(storedVariant) && variants.includes(storedVariant)) {
        return storedVariant;
    }

    const selectedVariant = variants[Math.floor(Math.random() * variants.length)] ?? 'rails_assistant';
    window.localStorage.setItem(VARIANT_STORAGE_KEY, selectedVariant);
    return selectedVariant;
}

function getSessionType(): 'new' | 'returning' {
    if (typeof window === 'undefined') {
        return 'new';
    }

    const hasVisitedHome = window.localStorage.getItem(HOME_VISITED_STORAGE_KEY) === 'true';
    if (hasVisitedHome) {
        return 'returning';
    }

    window.localStorage.setItem(HOME_VISITED_STORAGE_KEY, 'true');
    return 'new';
}

export function getHomeExperimentContext(): HomeExperimentContext {
    const experimentId = process.env.NEXT_PUBLIC_HOME_EXPERIMENT_ID || EXPERIMENT_ID_FALLBACK;
    const variants = parseVariantList(process.env.NEXT_PUBLIC_HOME_EXPERIMENT_VARIANTS);

    return {
        experiment_id: experimentId,
        variant_id: getOrCreateVariant(variants),
        geo_bucket: process.env.NEXT_PUBLIC_HOME_GEO_BUCKET || 'unknown',
        session_type: getSessionType()
    };
}

export function resolveHomeFeatureFlags(
    flags: HomeFeatureFlags,
    variant: HomeExperimentVariant
): HomeFeatureFlags {
    if (variant === 'control') {
        return {
            ...flags,
            home_intent_rails: false,
            home_discovery_chat: false,
            home_price_compare: false,
            home_visual_hierarchy_v2: false,
            home_state_polish_v1: false,
            home_filters_sort_v1: false,
            home_personalized_rails_v1: false,
            home_search_suggestions_v1: false
        };
    }

    if (variant === 'intent_first') {
        return {
            ...flags,
            home_intent_rails: true,
            home_discovery_chat: false,
            home_price_compare: false
        };
    }

    if (variant === 'rails_only') {
        return {
            ...flags,
            home_intent_rails: true,
            home_discovery_chat: false,
            home_price_compare: true
        };
    }

    return {
        ...flags,
        home_intent_rails: true,
        home_discovery_chat: true,
        home_price_compare: true
    };
}

export function resolveHomeLayoutMode(context: HomeExperimentContext): HomeLayoutMode {
    if (context.variant_id !== 'control') {
        return 'intent_rails';
    }

    if (context.experiment_id === 'home_discovery_exp_a' || context.experiment_id === EXPERIMENT_ID_FALLBACK) {
        return 'legacy_list';
    }

    return 'intent_rails';
}
