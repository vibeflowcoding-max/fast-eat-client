import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getHomeFeatureFlags } from './flags';

const ORIGINAL_ENV = { ...process.env };

describe('getHomeFeatureFlags', () => {
    beforeEach(() => {
        process.env = { ...ORIGINAL_ENV };
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };
    });

    it('returns default values when environment variables are not set', () => {
        // Ensure environment variables are not set for this test
        const envVars = [
            'NEXT_PUBLIC_HOME_INTENT_RAILS',
            'NEXT_PUBLIC_HOME_PRICE_COMPARE',
            'NEXT_PUBLIC_HOME_DISCOVERY_CHAT',
            'NEXT_PUBLIC_HOME_VISUAL_HIERARCHY_V2',
            'NEXT_PUBLIC_HOME_STATE_POLISH_V1',
            'NEXT_PUBLIC_HOME_FILTERS_SORT_V1',
            'NEXT_PUBLIC_HOME_PERSONALIZED_RAILS_V1',
            'NEXT_PUBLIC_HOME_SEARCH_SUGGESTIONS_V1',
            'NEXT_PUBLIC_HOME_SURPRISE_ME',
            'NEXT_PUBLIC_HOME_DIETARY_GUARDIAN',
            'NEXT_PUBLIC_HOME_PREDICTIVE_REORDER'
        ];

        envVars.forEach(v => delete process.env[v]);

        const flags = getHomeFeatureFlags();
        expect(flags).toEqual({
            home_intent_rails: true,
            home_price_compare: true,
            home_discovery_chat: true,
            home_visual_hierarchy_v2: false,
            home_state_polish_v1: false,
            home_filters_sort_v1: false,
            home_personalized_rails_v1: false,
            home_search_suggestions_v1: true,
            home_surprise_me: false,
            home_dietary_guardian: false,
            home_predictive_reorder: false
        });
    });

    it('parses "true" (case-insensitive) as true', () => {
        process.env.NEXT_PUBLIC_HOME_INTENT_RAILS = 'true';
        process.env.NEXT_PUBLIC_HOME_VISUAL_HIERARCHY_V2 = 'TRUE';

        const flags = getHomeFeatureFlags();
        expect(flags.home_intent_rails).toBe(true);
        expect(flags.home_visual_hierarchy_v2).toBe(true);
    });

    it('parses "false" (case-insensitive) or other values as false', () => {
        process.env.NEXT_PUBLIC_HOME_INTENT_RAILS = 'false';
        process.env.NEXT_PUBLIC_HOME_PRICE_COMPARE = 'FALSE';
        process.env.NEXT_PUBLIC_HOME_DISCOVERY_CHAT = 'anything';

        const flags = getHomeFeatureFlags();
        expect(flags.home_intent_rails).toBe(false);
        expect(flags.home_price_compare).toBe(false);
        expect(flags.home_discovery_chat).toBe(false);
    });

    it('handles a mix of environment variables and defaults', () => {
        // Clear variables that have true as default if we want to test they still default to true
        delete process.env.NEXT_PUBLIC_HOME_INTENT_RAILS;

        process.env.NEXT_PUBLIC_HOME_VISUAL_HIERARCHY_V2 = 'true';
        process.env.NEXT_PUBLIC_HOME_STATE_POLISH_V1 = 'false';

        const flags = getHomeFeatureFlags();
        expect(flags.home_intent_rails).toBe(true); // Default
        expect(flags.home_visual_hierarchy_v2).toBe(true); // Overridden to true
        expect(flags.home_state_polish_v1).toBe(false); // Overridden to false
    });
});
