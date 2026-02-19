import { emitHomeEvent } from './analytics';

vi.mock('./experiments', () => ({
    getHomeExperimentContext: vi.fn(() => ({
        experiment_id: 'exp-home-v1',
        variant_id: 'rails_only',
        geo_bucket: 'co-bogota',
        session_type: 'returning'
    }))
}));

describe('emitHomeEvent', () => {
    it('dispatches event with experiment dimensions', () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

        emitHomeEvent({ name: 'home_view' });

        expect(dispatchSpy).toHaveBeenCalledTimes(1);
        const dispatchedEvent = dispatchSpy.mock.calls[0][0] as CustomEvent;
        expect(dispatchedEvent.type).toBe('home-analytics-event');
        expect(dispatchedEvent.detail).toEqual({
            name: 'home_view',
            experiment_id: 'exp-home-v1',
            variant_id: 'rails_only',
            geo_bucket: 'co-bogota',
            session_type: 'returning'
        });
    });

    it('keeps explicit event dimensions when provided by caller', () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

        emitHomeEvent({
            name: 'home_view',
            variant_id: 'control',
            experiment_id: 'forced-exp',
            geo_bucket: 'manual',
            session_type: 'new'
        });

        const dispatchedEvent = dispatchSpy.mock.calls[0][0] as CustomEvent;
        expect(dispatchedEvent.detail).toEqual({
            name: 'home_view',
            variant_id: 'control',
            experiment_id: 'forced-exp',
            geo_bucket: 'manual',
            session_type: 'new'
        });
    });
});
