'use client';

import React, { useState } from 'react';
import { ChefHat, Sparkles, Utensils } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

interface SurpriseMeResponse {
    restaurantId: string;
    itemId: string;
    justification: string;
}

interface SurpriseMeWidgetProps {
    onRecommendationClick?: (restaurantId: string) => void;
}

export default function SurpriseMeWidget({ onRecommendationClick }: SurpriseMeWidgetProps) {
    const t = useTranslations('home.surpriseMe');
    const locale = useLocale();
    const [mood, setMood] = useState('');
    const [budget, setBudget] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SurpriseMeResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mood || !budget) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/discovery/surprise', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-locale': locale,
                },
                body: JSON.stringify({
                    mood,
                    budget: Number(budget),
                    location: { lat: 9.9281, lng: -84.0907 }, // Default San Jose
                    dietary_profile: {}
                })
            });

            if (!response.ok) {
                throw new Error(t('errors.fetchRecommendation'));
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('errors.unknown'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mb-6 relative overflow-hidden">
            {/* Decorative background blur */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-400/10 dark:bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-3 mb-5 relative z-10">
                <div className="p-2.5 bg-gradient-to-br from-orange-400 to-rose-500 rounded-xl text-white shadow-md shadow-orange-500/20">
                    <Sparkles className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                        {t('title')}
                    </h2>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('subtitle')}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-3 relative z-10">
                    <div className="relative">
                        <input
                            type="text"
                            value={mood}
                            onChange={(e) => setMood(e.target.value)}
                            placeholder={t('moodPlaceholder')}
                            className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 text-sm font-medium"
                            required
                        />
                    </div>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₡</span>
                        <input
                            type="number"
                            value={budget}
                            onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : '')}
                            placeholder={t('budgetPlaceholder')}
                            className="w-full pl-9 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 text-sm font-medium"
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || !mood || !budget}
                    className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:from-orange-600 hover:to-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-orange-500/20 mt-1 relative z-10"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white dark:border-slate-900/20 dark:border-t-slate-900 rounded-full animate-spin" />
                            <span>{t('thinking')}</span>
                        </>
                    ) : (
                        <>
                            <ChefHat className="w-5 h-5" />
                            <span>{t('discoverDish')}</span>
                        </>
                    )}
                </button>
            </form>

            {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl">
                    {error}
                </div>
            )}

            {result && (
                <div className="mt-5 p-4 bg-orange-50/50 dark:bg-slate-800/50 rounded-xl border border-orange-100 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
                    <div className="flex gap-3.5">
                        <div className="w-12 h-12 shrink-0 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-orange-500 shadow-sm border border-orange-100 dark:border-slate-700">
                            <Utensils className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">
                                    {t('perfectMatch')}
                                </span>
                                <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight truncate">
                                    {result.itemId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-orange-100 dark:border-slate-800 leading-relaxed">
                                    "{result.justification}"
                                </p>
                            </div>

                            <button
                                onClick={() => onRecommendationClick?.(result.restaurantId)}
                                className="mt-3 text-xs font-bold bg-white border border-gray-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 rounded-lg hover:bg-gray-50 flex items-center justify-center w-full transition-colors shadow-sm"
                            >
                                {t('viewRestaurant')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
