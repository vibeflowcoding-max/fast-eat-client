const dietaryCheckCache = new Map();
const DIETARY_CACHE_TTL_MS = 30 * 60 * 1000;

function getCachedDietaryCheck(menuItemId, dietaryProfile) {
    const key = `${menuItemId}-${JSON.stringify(dietaryProfile)}`;
    const cached = dietaryCheckCache.get(key);

    if (!cached) return null;
    if (cached.expiresAt < Date.now()) {
        dietaryCheckCache.delete(key);
        return null;
    }
    return cached.payload;
}

function setCachedDietaryCheck(menuItemId, dietaryProfile, payload) {
    const key = `${menuItemId}-${JSON.stringify(dietaryProfile)}`;
    dietaryCheckCache.set(key, {
        payload,
        expiresAt: Date.now() + DIETARY_CACHE_TTL_MS
    });
}

import assert from 'assert';

console.log('--- Testing Cache Logic ---');

const menuItemId = 'item-123';
const dietaryProfile = { diet: 'vegan', allergies: ['nuts'] };
const result = { is_safe: true, confidence: 0.9, reason: 'Looks good' };

// 1. Initial check (should be null)
console.log('Testing initial cache state...');
const initial = getCachedDietaryCheck(menuItemId, dietaryProfile);
assert.strictEqual(initial, null, 'Cache should be empty initially');
console.log('✅ Initial cache state is null');

// 2. Set cache
console.log('Setting cache...');
setCachedDietaryCheck(menuItemId, dietaryProfile, result);
console.log('✅ Cache set');

// 3. Retrieve from cache
console.log('Retrieving from cache...');
const retrieved = getCachedDietaryCheck(menuItemId, dietaryProfile);
assert.deepStrictEqual(retrieved, result, 'Retrieved result should match stored result');
console.log('✅ Retrieved result matches');

// 4. Check different profile (should be null)
console.log('Testing different profile...');
const differentProfile = { diet: 'vegan', allergies: [] };
const differentRetrieved = getCachedDietaryCheck(menuItemId, differentProfile);
assert.strictEqual(differentRetrieved, null, 'Cache should be empty for different profile');
console.log('✅ Different profile returns null');

// 5. Check different item (should be null)
console.log('Testing different item...');
const differentItem = 'item-456';
const itemRetrieved = getCachedDietaryCheck(differentItem, dietaryProfile);
assert.strictEqual(itemRetrieved, null, 'Cache should be empty for different item');
console.log('✅ Different item returns null');

console.log('--- Cache Logic Tests Passed ---');
