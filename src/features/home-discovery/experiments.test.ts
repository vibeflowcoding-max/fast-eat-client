import {
    getHomeExperimentContext,
    resolveHomeFeatureFlags,
    resolveHomeLayoutMode,
    type HomeExperimentContext,
    type HomeExperimentVariant
} from './experiments';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
});

afterAll(() => {
    process.env = ORIGINAL_ENV;
});

describe('resolveHomeFeatureFlags', () => {
    const baseFlags = {
        home_intent_rails: true,
        home_discovery_chat: true,
        home_price_compare: true,
        home_visual_hierarchy_v2: true,
        home_state_polish_v1: true,
        home_filters_sort_v1: true,
        home_personalized_rails_v1: true,
        home_search_suggestions_v1: true
    };

    it.each<{
        variant: HomeExperimentVariant;
        expected: typeof baseFlags;
    }>([
        {
            variant: 'control',
            expected: {
                home_intent_rails: false,
                home_discovery_chat: false,
                home_price_compare: false,
                home_visual_hierarchy_v2: false,
                home_state_polish_v1: false,
                home_filters_sort_v1: false,
                home_personalized_rails_v1: false,
                home_search_suggestions_v1: false
            }
        },
        {
            variant: 'intent_first',
            expected: {
                home_intent_rails: true,
                home_discovery_chat: false,
                home_price_compare: false,
                home_visual_hierarchy_v2: true,
                home_state_polish_v1: true,
                home_filters_sort_v1: true,
                home_personalized_rails_v1: true,
                home_search_suggestions_v1: true
            }
        },
        {
            variant: 'rails_only',
            expected: {
                home_intent_rails: true,
                home_discovery_chat: false,
                home_price_compare: true,
                home_visual_hierarchy_v2: true,
                home_state_polish_v1: true,
                home_filters_sort_v1: true,
                home_personalized_rails_v1: true,
                home_search_suggestions_v1: true
            }
        },
        {
            variant: 'rails_assistant',
            expected: {
                home_intent_rails: true,
                home_discovery_chat: true,
                home_price_compare: true,
                home_visual_hierarchy_v2: true,
                home_state_polish_v1: true,
                home_filters_sort_v1: true,
                home_personalized_rails_v1: true,
                home_search_suggestions_v1: true
            }
        }
    ])('maps variant $variant to expected flags', ({ variant, expected }) => {
        expect(resolveHomeFeatureFlags(baseFlags, variant)).toEqual(expected);
    });
});

describe('resolveHomeLayoutMode', () => {
    const baseContext: HomeExperimentContext = {
        experiment_id: 'home_discovery_exp_a',
        variant_id: 'intent_first',
        geo_bucket: 'unknown',
        session_type: 'new'
    };

    it('returns legacy list for Experiment A control variant', () => {
        expect(resolveHomeLayoutMode({ ...baseContext, variant_id: 'control' })).toBe('legacy_list');
    });

    it('returns intent rails for Experiment A intent-first variant', () => {
        expect(resolveHomeLayoutMode(baseContext)).toBe('intent_rails');
    });

    it('returns intent rails for non-Experiment-A control variant', () => {
        expect(
            resolveHomeLayoutMode({
                ...baseContext,
                experiment_id: 'home_discovery_exp_b',
                variant_id: 'control'
            })
        ).toBe('intent_rails');
    });
});

describe('getHomeExperimentContext canary gating', () => {
    it('assigns baseline variant when canary percent is 0', () => {
        process.env.NEXT_PUBLIC_HOME_EXPERIMENT_ID = 'home_discovery_exp_a';
        process.env.NEXT_PUBLIC_HOME_EXPERIMENT_VARIANTS = 'control,intent_first';
        process.env.NEXT_PUBLIC_HOME_EXPERIMENT_CANARY_PERCENT = '0';
        process.env.NEXT_PUBLIC_HOME_EXPERIMENT_BASELINE_VARIANT = 'control';

        const context = getHomeExperimentContext();
        expect(context.variant_id).toBe('control');
    });

    it('assigns test variant when canary percent is 100', () => {
        process.env.NEXT_PUBLIC_HOME_EXPERIMENT_ID = 'home_discovery_exp_b';
        process.env.NEXT_PUBLIC_HOME_EXPERIMENT_VARIANTS = 'rails_only,rails_assistant';
        process.env.NEXT_PUBLIC_HOME_EXPERIMENT_CANARY_PERCENT = '100';

        vi.spyOn(Math, 'random').mockReturnValue(0);

        const context = getHomeExperimentContext();
        expect(context.variant_id).toBe('rails_only');
    });

    it('prioritizes force variant override regardless of canary percentage', () => {
        process.env.NEXT_PUBLIC_HOME_EXPERIMENT_ID = 'home_discovery_exp_b';
        process.env.NEXT_PUBLIC_HOME_EXPERIMENT_VARIANTS = 'rails_only,rails_assistant';
        process.env.NEXT_PUBLIC_HOME_EXPERIMENT_CANARY_PERCENT = '0';
        process.env.NEXT_PUBLIC_HOME_EXPERIMENT_FORCE_VARIANT = 'rails_assistant';

        const context = getHomeExperimentContext();
        expect(context.variant_id).toBe('rails_assistant');
    });
});
