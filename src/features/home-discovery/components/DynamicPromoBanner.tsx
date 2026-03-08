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
            <div className="mb-4 rounded-[1.75rem] border border-white/30 bg-[linear-gradient(135deg,#ec5b13_0%,#fb923c_55%,#f97316_100%)] p-4 text-white shadow-[0_20px_44px_-24px_rgba(236,91,19,0.7)] animate-pulse">
                <p className="text-xs font-black uppercase tracking-[0.14em] opacity-80">{t('loading')}</p>
            </div>
        );
    }

    if (!promo) return null;

    return (
        <div className="relative mb-4 overflow-hidden rounded-[1.9rem] border border-white/30 bg-[linear-gradient(135deg,#ec5b13_0%,#fb923c_45%,#f97316_100%)] p-4 text-white shadow-[0_22px_48px_-24px_rgba(236,91,19,0.78)] animate-fadeIn">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
            <button
                type="button"
                onClick={handlePrimaryAction}
                className="w-full rounded-2xl pr-12 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/80">{t('title')}</p>
                <p className="text-sm font-black leading-snug tracking-[-0.01em] md:text-[15px]">{promo}</p>
            </button>
            <button
                onClick={handleDismiss}
                className="absolute right-3 top-3 z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/16 text-xs font-bold transition-colors hover:bg-white/28"
                aria-label={t('closeAria')}
            >
                <span className="pointer-events-none">✕</span>
            </button>
        </div>
    );
}
