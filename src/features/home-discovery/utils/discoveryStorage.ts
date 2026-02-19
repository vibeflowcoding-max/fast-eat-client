import { APP_CONSTANTS } from '@/constants';
import { RestaurantWithBranches } from '@/types';
import { ChatHistoryItem, HomePreferenceHints, ViewedRestaurantSignal } from '../types';

const VIEWED_HISTORY_MAX_ITEMS = 30;
const VIEWED_HISTORY_TTL_MS = 1000 * 60 * 60 * 24 * 14;

function readStorage<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') {
        return fallback;
    }

    try {
        const rawValue = window.localStorage.getItem(key);
        if (!rawValue) {
            return fallback;
        }

        return JSON.parse(rawValue) as T;
    } catch {
        return fallback;
    }
}

function writeStorage<T>(key: string, value: T) {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Fail silently
    }
}

export function getHomeDiscoverySessionId() {
    const key = APP_CONSTANTS.STORAGE_KEYS.HOME_DISCOVERY_SESSION;
    const existing = readStorage<string | null>(key, null);
    if (existing) {
        return existing;
    }

    const sessionId = `home-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    writeStorage(key, sessionId);
    return sessionId;
}

export function getHomeDiscoveryHistory() {
    return readStorage<ChatHistoryItem[]>(APP_CONSTANTS.STORAGE_KEYS.HOME_DISCOVERY_HISTORY, []);
}

export function setHomeDiscoveryHistory(history: ChatHistoryItem[]) {
    writeStorage(APP_CONSTANTS.STORAGE_KEYS.HOME_DISCOVERY_HISTORY, history);
}

function normalizeViewedHistory(entries: ViewedRestaurantSignal[]) {
    const now = Date.now();
    const bounded = entries
        .filter((entry) => now - entry.viewedAt <= VIEWED_HISTORY_TTL_MS)
        .sort((left, right) => right.viewedAt - left.viewedAt)
        .slice(0, VIEWED_HISTORY_MAX_ITEMS);

    const dedupedByRestaurant = new Map<string, ViewedRestaurantSignal>();
    for (const entry of bounded) {
        if (!dedupedByRestaurant.has(entry.restaurantId)) {
            dedupedByRestaurant.set(entry.restaurantId, entry);
        }
    }

    return Array.from(dedupedByRestaurant.values())
        .sort((left, right) => right.viewedAt - left.viewedAt)
        .slice(0, VIEWED_HISTORY_MAX_ITEMS);
}

export function getViewedRestaurantsHistory() {
    const key = APP_CONSTANTS.STORAGE_KEYS.HOME_DISCOVERY_VIEWED;
    const existing = readStorage<ViewedRestaurantSignal[]>(key, []);
    const normalized = normalizeViewedHistory(existing);

    if (normalized.length !== existing.length) {
        writeStorage(key, normalized);
    }

    return normalized;
}

export function trackViewedRestaurant(restaurant: RestaurantWithBranches) {
    const key = APP_CONSTANTS.STORAGE_KEYS.HOME_DISCOVERY_VIEWED;
    const current = readStorage<ViewedRestaurantSignal[]>(key, []);
    const nextEntry: ViewedRestaurantSignal = {
        restaurantId: restaurant.id,
        viewedAt: Date.now(),
        categories: restaurant.categories.map((category) => category.name),
        etaMinutes: restaurant.eta_min ?? null,
        finalPriceEstimate: restaurant.avg_price_estimate ?? null
    };

    const updated = normalizeViewedHistory([nextEntry, ...current]);
    writeStorage(key, updated);
    return updated;
}

export function clearViewedRestaurantsHistory() {
    writeStorage(APP_CONSTANTS.STORAGE_KEYS.HOME_DISCOVERY_VIEWED, []);
}

export function buildPreferenceHints(history: ViewedRestaurantSignal[]): HomePreferenceHints {
    if (history.length === 0) {
        return { categoryWeights: {} };
    }

    const categoryWeights: Record<string, number> = {};
    let etaTotal = 0;
    let etaCount = 0;
    let priceTotal = 0;
    let priceCount = 0;

    history.forEach((entry, index) => {
        const recencyWeight = Math.max(1, history.length - index);

        entry.categories.forEach((categoryName) => {
            const normalized = categoryName.toLowerCase();
            categoryWeights[normalized] = (categoryWeights[normalized] ?? 0) + recencyWeight;
        });

        if (typeof entry.etaMinutes === 'number' && entry.etaMinutes > 0) {
            etaTotal += entry.etaMinutes;
            etaCount += 1;
        }

        if (typeof entry.finalPriceEstimate === 'number' && entry.finalPriceEstimate > 0) {
            priceTotal += entry.finalPriceEstimate;
            priceCount += 1;
        }
    });

    return {
        categoryWeights,
        preferredEtaMax: etaCount > 0 ? Math.round(etaTotal / etaCount) : undefined,
        preferredPriceMax: priceCount > 0 ? Math.round(priceTotal / priceCount) : undefined
    };
}
