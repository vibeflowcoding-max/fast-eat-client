import { describe, it, expect } from 'vitest';
import { isRecommendationItem } from './_lib';
import { RecommendationItem } from '@/features/home-discovery/types';

describe('isRecommendationItem', () => {
    const validRecommendation: RecommendationItem = {
        kind: 'restaurant',
        id: 'rec-123',
        restaurantId: 'rest-456',
        title: 'Sushi Zen',
        score: 0.95,
        reasons: ['Great reviews', 'Near you'],
    };

    it('should return true for a valid RecommendationItem', () => {
        expect(isRecommendationItem(validRecommendation)).toBe(true);
    });

    it('should return true for valid RecommendationItem with optional fields', () => {
        const itemWithOptionals: RecommendationItem = {
            ...validRecommendation,
            subtitle: 'Best sushi in town',
            basePrice: 2000,
            discountAmount: 500,
            finalPrice: 1500,
            estimatedDeliveryFee: 100,
            etaMin: 30,
            tags: ['sushi', 'japanese']
        };
        expect(isRecommendationItem(itemWithOptionals)).toBe(true);
    });

    it('should return true for all valid kinds', () => {
        const kinds = ['restaurant', 'combo', 'dish', 'deal'] as const;
        kinds.forEach(kind => {
            expect(isRecommendationItem({ ...validRecommendation, kind })).toBe(true);
        });
    });

    it('should return false for invalid kind', () => {
        expect(isRecommendationItem({ ...validRecommendation, kind: 'invalid-kind' })).toBe(false);
        expect(isRecommendationItem({ ...validRecommendation, kind: null })).toBe(false);
        expect(isRecommendationItem({ ...validRecommendation, kind: undefined })).toBe(false);
    });

    it('should return false if id is missing or not a string', () => {
        expect(isRecommendationItem({ ...validRecommendation, id: undefined })).toBe(false);
        expect(isRecommendationItem({ ...validRecommendation, id: 123 })).toBe(false);
        expect(isRecommendationItem({ ...validRecommendation, id: null })).toBe(false);
    });

    it('should return false if restaurantId is missing or not a string', () => {
        expect(isRecommendationItem({ ...validRecommendation, restaurantId: undefined })).toBe(false);
        expect(isRecommendationItem({ ...validRecommendation, restaurantId: 456 })).toBe(false);
        expect(isRecommendationItem({ ...validRecommendation, restaurantId: null })).toBe(false);
    });

    it('should return false if title is missing or not a string', () => {
        expect(isRecommendationItem({ ...validRecommendation, title: undefined })).toBe(false);
        expect(isRecommendationItem({ ...validRecommendation, title: 123 })).toBe(false);
        expect(isRecommendationItem({ ...validRecommendation, title: null })).toBe(false);
    });

    it('should return false if score is missing or not a number', () => {
        expect(isRecommendationItem({ ...validRecommendation, score: undefined })).toBe(false);
        expect(isRecommendationItem({ ...validRecommendation, score: '0.95' })).toBe(false);
        expect(isRecommendationItem({ ...validRecommendation, score: null })).toBe(false);
    });

    it('should return false if reasons is missing, not an array, or contains non-strings', () => {
        expect(isRecommendationItem({ ...validRecommendation, reasons: undefined })).toBe(false);
        expect(isRecommendationItem({ ...validRecommendation, reasons: 'Great reviews' })).toBe(false);
        expect(isRecommendationItem({ ...validRecommendation, reasons: null })).toBe(false);
        expect(isRecommendationItem({ ...validRecommendation, reasons: [123, 'Near you'] })).toBe(false);
        expect(isRecommendationItem({ ...validRecommendation, reasons: [null] })).toBe(false);
    });

    it('should return false for non-object inputs', () => {
        expect(isRecommendationItem(null)).toBe(false);
        expect(isRecommendationItem(undefined)).toBe(false);
        expect(isRecommendationItem('string')).toBe(false);
        expect(isRecommendationItem(123)).toBe(false);
        expect(isRecommendationItem(true)).toBe(false);
        expect(isRecommendationItem([])).toBe(false);
    });

    it('should return false for empty object', () => {
        expect(isRecommendationItem({})).toBe(false);
    });
});
