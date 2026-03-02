import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
}

interface LoyaltyState {
    points: number;
    currentStreak: number;
    longestStreak: number;
    lastOrderDate: string | null;
    badges: Badge[];
    isHydrating: boolean;
    hasHydrated: boolean;
    hydrateError: string | null;

    // Actions
    hydrate: () => Promise<void>;
    addPoints: (amount: number, reason: string) => void;
    incrementStreak: () => void;
    awardBadge: (badge: Omit<Badge, 'earnedAt'>) => void;
    resetStreakIfExpired: () => void;
}

interface LoyaltyApiPayload {
    points?: number | null;
    currentStreak?: number | null;
    longestStreak?: number | null;
    lastOrderDate?: string | null;
    badges?: Array<{
        id?: string;
        name?: string;
        description?: string;
        icon?: string;
        earnedAt?: string;
    }>;
}

function toSafeNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

export const useLoyaltyStore = create<LoyaltyState>()(
    persist(
        (set, get) => ({
            points: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastOrderDate: null,
            badges: [],
            isHydrating: false,
            hasHydrated: false,
            hydrateError: null,

            hydrate: async () => {
                const { isHydrating } = get();
                if (isHydrating) {
                    return;
                }

                set({ isHydrating: true, hydrateError: null });

                try {
                    const { data } = await supabase.auth.getSession();
                    const accessToken = data.session?.access_token;

                    if (!accessToken) {
                        throw new Error('No authenticated session found.');
                    }

                    const response = await fetch('/api/consumer/me/loyalty', {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        },
                        cache: 'no-store'
                    });

                    const payload: unknown = await response.json();
                    if (!response.ok) {
                        throw new Error('Could not load loyalty profile.');
                    }

                    const loyalty = ((payload as { data?: unknown })?.data ?? {}) as LoyaltyApiPayload;
                    const badges = Array.isArray(loyalty.badges)
                        ? loyalty.badges
                            .map((badge) => {
                                if (
                                    typeof badge?.id !== 'string' ||
                                    typeof badge?.name !== 'string' ||
                                    typeof badge?.description !== 'string' ||
                                    typeof badge?.icon !== 'string' ||
                                    typeof badge?.earnedAt !== 'string'
                                ) {
                                    return null;
                                }

                                return {
                                    id: badge.id,
                                    name: badge.name,
                                    description: badge.description,
                                    icon: badge.icon,
                                    earnedAt: badge.earnedAt
                                } satisfies Badge;
                            })
                            .filter((badge): badge is Badge => badge !== null)
                        : [];

                    set({
                        points: toSafeNumber(loyalty.points),
                        currentStreak: toSafeNumber(loyalty.currentStreak),
                        longestStreak: toSafeNumber(loyalty.longestStreak),
                        lastOrderDate: typeof loyalty.lastOrderDate === 'string' ? loyalty.lastOrderDate : null,
                        badges,
                        isHydrating: false,
                        hasHydrated: true,
                        hydrateError: null
                    });
                } catch (error) {
                    set({
                        isHydrating: false,
                        hasHydrated: true,
                        hydrateError: error instanceof Error ? error.message : 'Could not load loyalty profile.'
                    });
                }
            },

            addPoints: (amount) => set((state) => ({
                points: state.points + amount
            })),

            incrementStreak: () => set((state) => {
                const newStreak = state.currentStreak + 1;
                return {
                    currentStreak: newStreak,
                    longestStreak: Math.max(state.longestStreak, newStreak),
                    lastOrderDate: new Date().toISOString()
                };
            }),

            awardBadge: (badgeData) => set((state) => {
                if (state.badges.some(b => b.id === badgeData.id)) return state;

                return {
                    badges: [...state.badges, { ...badgeData, earnedAt: new Date().toISOString() }]
                };
            }),

            resetStreakIfExpired: () => set((state) => {
                if (!state.lastOrderDate) return state;

                const lastOrder = new Date(state.lastOrderDate).getTime();
                const now = new Date().getTime();
                const daysSinceLastOrder = (now - lastOrder) / (1000 * 3600 * 24);

                // If more than 7 days have passed, streak is broken
                if (daysSinceLastOrder > 7) {
                    return { currentStreak: 0 };
                }
                return state;
            })
        }),
        {
            name: 'fasteat-loyalty-storage',
            partialize: (state) => ({
                points: state.points,
                currentStreak: state.currentStreak,
                longestStreak: state.longestStreak,
                lastOrderDate: state.lastOrderDate,
                badges: state.badges,
                hasHydrated: state.hasHydrated,
            }),
        }
    )
);
