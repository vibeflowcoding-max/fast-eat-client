import React, { useEffect, useState } from 'react';
import { emitHomeEvent } from '@/features/home-discovery/analytics';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';

interface DynamicPromoBannerProps {
    onPromoClick?: () => void;
}

const PROMO_DISMISS_SESSION_KEY = 'home_banner_promo_dismissed_v1';

export default function DynamicPromoBanner({ onPromoClick }: DynamicPromoBannerProps) {
    const t = useTranslations('home.promoBanner');
    const [promo, setPromo] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.sessionStorage.getItem(PROMO_DISMISS_SESSION_KEY) === '1') {
            setIsVisible(false);
            emitHomeEvent({
                name: 'home_banner_dismiss',
                banner_id: 'promo',
                dismiss_reason: 'session_restored'
            });
            return;
        }

        const abortController = new AbortController();

        async function loadActivePromotion() {
            setIsLoading(true);

            try {
                const { data } = await supabase.auth.getSession();
                const accessToken = data.session?.access_token;

                if (!accessToken) {
                    setPromo(null);
                    return;
                }

                const response = await fetch('/api/consumer/promotions/active', {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    },
                    cache: 'no-store',
                    signal: abortController.signal
                });

                if (!response.ok) {
                    setPromo(null);
                    return;
                }

                const payload: unknown = await response.json();
                const promotions = Array.isArray((payload as { data?: unknown })?.data)
                    ? (payload as { data: Array<{ title?: unknown }> }).data
                    : [];

                const firstActive = promotions.find((item) => typeof item?.title === 'string' && item.title.trim().length > 0);
                setPromo(typeof firstActive?.title === 'string' ? firstActive.title.trim() : null);
            } catch {
                if (abortController.signal.aborted) {
                    return;
                }

                setPromo(null);
            } finally {
                if (!abortController.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        loadActivePromotion();

        return () => {
            abortController.abort();
        };
    }, [t]);

    useEffect(() => {
        if (!isVisible || !promo) {
            return;
        }

        emitHomeEvent({
            name: 'home_banner_impression',
            banner_id: 'promo'
        });
    }, [isVisible, promo]);

    const handleDismiss = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsVisible(false);
        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(PROMO_DISMISS_SESSION_KEY, '1');
        }

        emitHomeEvent({
            name: 'home_banner_dismiss',
            banner_id: 'promo',
            dismiss_reason: 'user_close'
        });
    };

    const handlePrimaryAction = () => {
        emitHomeEvent({
            name: 'home_banner_click',
            banner_id: 'promo',
            target_type: 'promo_intent'
        });

        if (onPromoClick) {
            onPromoClick();
            emitHomeEvent({
                name: 'home_banner_conversion',
                banner_id: 'promo',
                conversion_type: 'visit_promotions'
            });
            return;
        }

        emitHomeEvent({
            name: 'home_banner_fallback_shown',
            banner_id: 'promo',
            fallback_type: 'missing_target'
        });
    };

    if (!isVisible) return null;

    if (isLoading) {
        return (
            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 mb-4 rounded-2xl shadow-lg animate-pulse text-white border border-white/10">
                <p className="text-xs md:text-sm font-bold leading-snug tracking-wide opacity-80">{t('loading')}</p>
            </div>
        );
    }

    if (!promo) return null;

    return (
        <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 mb-4 rounded-2xl shadow-lg animate-fadeIn text-white border border-white/10 relative overflow-hidden">
            <button
                type="button"
                onClick={handlePrimaryAction}
                className="w-full pr-10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-xl"
            >
                <p className="text-xs md:text-sm font-bold leading-snug tracking-wide">{promo}</p>
            </button>
            <button
                onClick={handleDismiss}
                className="absolute top-2.5 right-2.5 shrink-0 bg-white/20 hover:bg-white/30 rounded-full w-9 h-9 flex items-center justify-center transition-colors text-xs font-bold cursor-pointer z-10"
                aria-label={t('closeAria')}
            >
                <span className="pointer-events-none">✕</span>
            </button>
        </div>
    );
}
