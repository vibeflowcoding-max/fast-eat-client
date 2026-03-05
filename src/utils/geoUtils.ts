/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in kilometers
    const toRad = Math.PI / 180;

    // Convert to radians once
    const radLat1 = lat1 * toRad;
    const radLat2 = lat2 * toRad;
    const dLat = radLat2 - radLat1;
    const dLon = (lon2 - lon1) * toRad;

    const sinDLat2 = Math.sin(dLat / 2);
    const sinDLon2 = Math.sin(dLon / 2);

    const a =
        sinDLat2 * sinDLat2 +
        Math.cos(radLat1) * Math.cos(radLat2) *
        sinDLon2 * sinDLon2;

    // Math.asin is mathematically equivalent to Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    // but noticeably faster in V8/JavaScript engines.
    return R * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
    if (km < 1) {
        return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
}

/**
 * Check if a location is within a given radius
 */
export function isWithinRadius(
    userLat: number,
    userLon: number,
    targetLat: number,
    targetLon: number,
    radiusKm: number
): boolean {
    return calculateDistance(userLat, userLon, targetLat, targetLon) <= radiusKm;
}
