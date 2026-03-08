import { describe, it, expect } from 'vitest';
import { formatDistance, calculateDistance, isWithinRadius } from './geoUtils';

describe('geoUtils', () => {
    describe('formatDistance', () => {
        it('formats distance less than 1 km in meters', () => {
            expect(formatDistance(0.5)).toBe('500 m');
            expect(formatDistance(0.999)).toBe('999 m');
            expect(formatDistance(0.001)).toBe('1 m');
            expect(formatDistance(0)).toBe('0 m');
        });

        it('formats distance exactly 1 km as 1.0 km', () => {
            expect(formatDistance(1)).toBe('1.0 km');
        });

        it('formats distance greater than 1 km in kilometers with 1 decimal place', () => {
            expect(formatDistance(1.5)).toBe('1.5 km');
            expect(formatDistance(2.34)).toBe('2.3 km');
            expect(formatDistance(2.35)).toBe('2.4 km'); // Checking rounding
            expect(formatDistance(10)).toBe('10.0 km');
        });
    });

    // Add some basic tests for the other functions in the file to improve overall coverage
    describe('calculateDistance', () => {
        it('calculates distance between two identical points as 0', () => {
            expect(calculateDistance(10, 10, 10, 10)).toBe(0);
        });

        it('calculates approximate distance correctly', () => {
            // New York to London is ~5570 km
            // Just ensuring it returns a number greater than 0
            const dist = calculateDistance(40.7128, -74.0060, 51.5074, -0.1278);
            expect(dist).toBeGreaterThan(5000);
            expect(dist).toBeLessThan(6000);
        });
    });

    describe('isWithinRadius', () => {
        it('returns true when points are exactly the same', () => {
            expect(isWithinRadius(10, 10, 10, 10, 5)).toBe(true);
        });

        it('returns true when points are within radius', () => {
            // New York coords with small change should be within 10km
            expect(isWithinRadius(40.7128, -74.0060, 40.7130, -74.0062, 10)).toBe(true);
        });

        it('returns false when points are outside radius', () => {
            // New York to London
            expect(isWithinRadius(40.7128, -74.0060, 51.5074, -0.1278, 100)).toBe(false);
        });

        it('returns true when point is exactly on the boundary', () => {
            const dist = calculateDistance(0, 0, 0, 1);
            expect(isWithinRadius(0, 0, 0, 1, dist)).toBe(true);
        });

        it('returns true when point is slightly inside the boundary', () => {
            const dist = calculateDistance(0, 0, 0, 1);
            expect(isWithinRadius(0, 0, 0, 1, dist + 0.0001)).toBe(true);
        });

        it('returns false when point is slightly outside the boundary', () => {
            const dist = calculateDistance(0, 0, 0, 1);
            expect(isWithinRadius(0, 0, 0, 1, dist - 0.0001)).toBe(false);
        });

        it('returns true when radius is 0 and points are identical', () => {
            expect(isWithinRadius(10, 10, 10, 10, 0)).toBe(true);
        });

        it('returns false when radius is 0 and points are different', () => {
            expect(isWithinRadius(10, 10, 10.0001, 10, 0)).toBe(false);
        });

        it('returns false when radius is negative', () => {
            expect(isWithinRadius(10, 10, 10, 10, -1)).toBe(false);
        });

        it('handles points across the 180th meridian', () => {
            // 179.9 and -179.9 are very close
            expect(isWithinRadius(0, 179.9, 0, -179.9, 50)).toBe(true);
        });

        it('handles points near the North Pole', () => {
            // Near North Pole (lat 90), longitude lines converge
            expect(isWithinRadius(89, 0, 89, 1, 10)).toBe(true);
        });
    });
});
