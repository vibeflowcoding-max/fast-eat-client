'use client';

import React, { useState, useEffect } from 'react';
import { Clock, X } from 'lucide-react';
import { emitHomeEvent } from '@/features/home-discovery/analytics';
import { useLocale, useTranslations } from 'next-intl';

interface PredictiveReorderResponse {
    should_prompt: boolean;
    confidence: number;
    restaurantId?: string;
    itemId?: string;
    prompt_message?: string;
}

interface PredictivePromptProps {
    onReorderClick?: (restaurantId: string, itemId: string) => boolean | void | Promise<boolean | void>;
    onFallbackClick?: () => void;
}

const PREDICTIVE_DISMISS_SESSION_KEY = 'home_banner_predictive_dismissed_v1';

export default function PredictivePrompt({ onReorderClick, onFallbackClick }: PredictivePromptProps) {
    const t = useTranslations('home.predictivePrompt');
    const locale = useLocale();
    const [isVisible, setIsVisible] = useState(false);
    const [prediction, setPrediction] = useState<PredictiveReorderResponse | null>(null);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isActing, setIsActing] = useState(false);
    const [fallbackType, setFallbackType] = useState<'offline' | 'api_error' | null>(null);
    const [hasTrackedImpression, setHasTrackedImpression] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        if (window.sessionStorage.getItem(PREDICTIVE_DISMISS_SESSION_KEY) === '1') {
            setIsDismissed(true);
            setIsVisible(false);
            setIsLoading(false);
            emitHomeEvent({
                name: 'home_banner_dismiss',
                banner_id: 'predictive',
                dismiss_reason: 'session_restored'
            });
        }
    }, []);

    useEffect(() => {
        // If already dismissed in this session, don't check again
        if (isDismissed) {
            return;
        }

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setFallbackType('offline');
            setIsVisible(true);
            setIsLoading(false);
            emitHomeEvent({
                name: 'home_banner_fallback_shown',
                banner_id: 'predictive',
                fallback_type: 'offline'
            });
            return;
        }

        const checkPrediction = async () => {
            try {
                // In a real app, you would pass the actual user's order history from the database/store
                const mockOrderHistory = [
                    { restaurantId: '123', itemId: 'coffee-latte', timestamp: Date.now() - 86400000 } // yesterday
                ];

                const response = await fetch('/api/discovery/predictive-reorder', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-locale': locale,
                    },
                    body: JSON.stringify({
                        order_history: mockOrderHistory,
                        current_time: new Date().toISOString(),
                        location: { lat: 9.9281, lng: -84.0907 }
                    })
                });

                if (!response.ok) {
                    setFallbackType('api_error');
                    setIsVisible(true);
                    setIsLoading(false);
                    emitHomeEvent({
                        name: 'home_banner_fallback_shown',
                        banner_id: 'predictive',
                        fallback_type: 'api_error'
                    });
                    return;
                }

                const data: PredictiveReorderResponse = await response.json();

                if (data.should_prompt && data.confidence > 0.7) {
                    setPrediction(data);
                    setIsVisible(true);
                    setFallbackType(null);
                } else {
                    setPrediction(null);
                    setIsVisible(false);
                }

                setIsLoading(false);
            } catch (error) {
                console.error('[PredictivePrompt] Failed to fetch prediction:', error);
                setFallbackType('api_error');
                setIsVisible(true);
                setIsLoading(false);
                emitHomeEvent({
                    name: 'home_banner_fallback_shown',
                    banner_id: 'predictive',
                    fallback_type: 'api_error'
                });
            }
        };

        checkPrediction();
    }, [isDismissed, locale]);

    useEffect(() => {
        if (!isVisible || isLoading || hasTrackedImpression) {
            return;
        }

        emitHomeEvent({
            name: 'home_banner_impression',
            banner_id: 'predictive',
            prediction_confidence: prediction?.confidence
        });
        setHasTrackedImpression(true);
    }, [hasTrackedImpression, isLoading, isVisible, prediction?.confidence]);

    const handleDismiss = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        setIsDismissed(true);
        setIsVisible(false);
        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(PREDICTIVE_DISMISS_SESSION_KEY, '1');
        }

        emitHomeEvent({
            name: 'home_banner_dismiss',
            banner_id: 'predictive',
            dismiss_reason: 'user_close'
        });
    };

    const handleFallbackAction = (type: 'offline' | 'api_error' | 'missing_target') => {
        setIsActing(true);
        emitHomeEvent({
            name: 'home_banner_click',
            banner_id: 'predictive',
            target_type: 'fallback_discovery',
            prediction_confidence: prediction?.confidence
        });
        emitHomeEvent({
            name: 'home_banner_fallback_shown',
            banner_id: 'predictive',
            fallback_type: type
        });
        onFallbackClick?.();

        window.setTimeout(() => {
            setIsActing(false);
        }, 1200);
    };

    const handlePrimaryAction = async () => {
        setIsActing(true);

        if (!prediction) {
            handleFallbackAction(fallbackType ?? 'api_error');
            return;
        }

        if (!prediction.restaurantId || !prediction.itemId) {
            handleFallbackAction('missing_target');
            return;
        }

        emitHomeEvent({
            name: 'home_banner_click',
            banner_id: 'predictive',
            target_type: 'reorder',
            restaurant_id: prediction.restaurantId,
            item_id: prediction.itemId,
            prediction_confidence: prediction.confidence
        });

        const actionResult = await Promise.resolve(onReorderClick?.(prediction.restaurantId, prediction.itemId));
        if (actionResult === false) {
            setIsActing(false);
            return;
        }

        emitHomeEvent({
            name: 'home_banner_conversion',
            banner_id: 'predictive',
            conversion_type: 'visit_restaurant',
            restaurant_id: prediction.restaurantId,
            item_id: prediction.itemId
        });
    };

    if (!isVisible || isDismissed) {
        return null;
    }

    const headline = fallbackType
        ? t('fallbackHeadline')
        : t('headline');

    const predictionMessage = locale.toLowerCase().startsWith('en')
        ? t('defaultMessage')
        : prediction?.prompt_message || t('defaultMessage');

    const message = fallbackType === 'offline'
        ? t('offlineMessage')
        : fallbackType === 'api_error'
            ? t('apiErrorMessage')
            : predictionMessage;

    const displayMessage = isActing ? t('loadingAction') : message;

    return (
        <div className="mx-4 mt-6 mb-5 animate-in slide-in-from-top-4 fade-in duration-500">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 pr-12 shadow-lg shadow-blue-900/20 relative overflow-hidden group">
                {/* Decorative background circle */}
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />

                <button
                    onClick={handleDismiss}
                    className="absolute top-2.5 right-2.5 shrink-0 bg-white/20 hover:bg-white/30 rounded-full w-9 h-9 flex items-center justify-center transition-colors text-xs font-bold cursor-pointer z-20"
                    aria-label={t('closeAria')}
                >
                    <X className="w-4 h-4 text-white/90" />
                </button>

                {isLoading ? (
                    <div className="relative z-10 flex items-center gap-4 opacity-90" aria-busy="true">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0 border border-white/20">
                            <Clock className="w-6 h-6 text-white animate-pulse" />
                        </div>
                        <div className="flex-1">
                            <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-0.5">
                                {t('headline')}
                            </p>
                            <h3 className="text-white font-bold text-sm leading-snug">
                                {t('loadingMessage')}
                            </h3>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={fallbackType ? () => handleFallbackAction(fallbackType) : () => {
                            void handlePrimaryAction();
                        }}
                        disabled={isActing}
                        className="w-full text-left relative z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-80"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0 border border-white/20">
                                <Clock className="w-6 h-6 text-white" />
                            </div>

                            <div className="flex-1">
                                <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-0.5">
                                    {headline}
                                </p>
                                <h3 className="text-white font-bold text-sm leading-snug">
                                    {displayMessage}
                                </h3>
                            </div>
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
}
