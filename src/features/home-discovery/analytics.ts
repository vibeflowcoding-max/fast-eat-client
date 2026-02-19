import { HomeAnalyticsEvent } from './types';
import { getHomeExperimentContext } from './experiments';

export function emitHomeEvent(event: HomeAnalyticsEvent) {
    try {
        if (typeof window === 'undefined') {
            return;
        }

        const eventWithDimensions = {
            ...getHomeExperimentContext(),
            ...event
        };

        window.dispatchEvent(new CustomEvent('home-analytics-event', { detail: eventWithDimensions }));

        if (process.env.NODE_ENV !== 'production') {
            console.info('[home-event]', eventWithDimensions);
        }
    } catch {
        // Never break UX for analytics
    }
}
