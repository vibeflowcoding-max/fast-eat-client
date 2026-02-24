import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

    // Actions
    addPoints: (amount: number, reason: string) => void;
    incrementStreak: () => void;
    awardBadge: (badge: Omit<Badge, 'earnedAt'>) => void;
    resetStreakIfExpired: () => void;
}

export const useLoyaltyStore = create<LoyaltyState>()(
    persist(
        (set, get) => ({
            // Initial Mock State to demonstrate UI
            points: 850,
            currentStreak: 2,
            longestStreak: 5,
            lastOrderDate: new Date().toISOString(),
            badges: [
                {
                    id: 'first_order',
                    name: 'Rompehielo',
                    description: 'Hiciste tu primer pedido.',
                    icon: '🧊',
                    earnedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
                }
            ],

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
        }
    )
);
