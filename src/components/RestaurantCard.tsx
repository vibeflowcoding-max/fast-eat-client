"use client";

/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { useRouter } from 'next/navigation';
import { RestaurantWithBranches } from '@/types';
import { formatDistance } from '@/utils/geoUtils';
import { MapPin, Star, Clock, Truck, ShieldCheck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/../resources/components';

interface RestaurantCardProps {
    restaurant: RestaurantWithBranches;
    onOpen?: (restaurant: RestaurantWithBranches) => void;
}

const CATEGORY_EN_MAP: Record<string, string> = {
    'alitas': 'Wings',
    'arabe': 'Middle Eastern',
    'argentina': 'Argentinian',
    'bar': 'Bar',
    'bbq': 'BBQ',
    'brasilena': 'Brazilian',
    'brunch': 'Brunch',
    'buffet': 'Buffet',
    'cafe': 'Cafe',
    'china': 'Chinese',
    'colombiana': 'Colombian',
    'comida rapida': 'Fast Food',
    'comida tipica': 'Traditional',
    'coreana': 'Korean',
    'cubana': 'Cuban',
    'desayunos': 'Breakfast',
    'ensaladas': 'Salads',
    'espanola': 'Spanish',
    'francesa': 'French',
    'fusion': 'Fusion',
    'griega': 'Greek',
    'hamburguesas gourmet': 'Gourmet Burgers',
    'helados': 'Ice Cream',
    'hot dogs': 'Hot Dogs',
    'india': 'Indian',
    'italiana': 'Italian',
    'japonesa': 'Japanese',
    'jugos y smoothies': 'Juices & Smoothies',
    'mariscos': 'Seafood',
    'mexicana': 'Mexican',
    'organica': 'Organic',
    'panaderia': 'Bakery',
    'peruana': 'Peruvian',
    'pollo frito': 'Fried Chicken',
    'reposteria': 'Pastries',
    'saludable': 'Healthy',
    'sandwiches': 'Sandwiches',
    'sin gluten': 'Gluten Free',
    'sopas': 'Soups',
    'tailandesa': 'Thai',
    'turca': 'Turkish',
    'vegana': 'Vegan',
    'vegetariana': 'Vegetarian',
    'vietnamita': 'Vietnamese',
    'wraps y burritos': 'Wraps & Burritos',
};

function normalizeCategoryName(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '');
}

function getLocalizedCategoryName(name: string, isEnglish: boolean): string {
    if (!isEnglish) {
        return name;
    }

    return CATEGORY_EN_MAP[normalizeCategoryName(name)] ?? name;
}

export default function RestaurantCard({ restaurant, onOpen }: RestaurantCardProps) {
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('home.restaurantCard');
    const isEnglish = locale.toLowerCase().startsWith('en');

    // Get the first active branch for display
    const primaryBranch = restaurant.branches?.[0];
    const imageUrl = primaryBranch?.image_url || restaurant.logo_url || '/placeholder-restaurant.svg';
    const categoryNames = restaurant.categories
        ?.map((category) => getLocalizedCategoryName(category.name, isEnglish))
        .join(', ') || t('restaurantFallback');
    const etaMinutes = restaurant.eta_min;
    const finalPriceEstimate = restaurant.avg_price_estimate;
    const rating = restaurant.rating;
    const hasPromo = Boolean(restaurant.promo_text);
    const deliveryFeeHint = primaryBranch?.estimated_delivery_fee ?? restaurant.estimated_delivery_fee;
    const hasRating = typeof rating === 'number' && !Number.isNaN(rating) && rating > 0;
    const ratingLabel = hasRating ? rating.toFixed(1) : t('noReviews');

    const handleClick = () => {
        onOpen?.(restaurant);
        // Navigate to the restaurant menu using the slug
        if (restaurant.slug) {
            router.push(`/${restaurant.slug}`);
        } else if (primaryBranch?.code) {
            router.push(`/${primaryBranch.code}`);
        }
    };

    const renderMedia = () => (
        <div className="relative aspect-[16/9] overflow-hidden bg-[var(--color-surface-muted)]">
            <img
                src={imageUrl}
                alt={t('imageAlt', { name: restaurant.name })}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none group-hover:scale-[1.02]"
                onError={(e) => {
                    const target = e.currentTarget;
                    if (target.dataset.fallbackApplied === 'true') {
                        return;
                    }

                    target.dataset.fallbackApplied = 'true';
                    target.src = '/placeholder-restaurant.svg';
                }}
            />

            <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
                {hasPromo && (
                    <Badge className="border-white/40 bg-[linear-gradient(135deg,var(--color-brand)_0%,#fb923c_100%)] text-[10px] font-black uppercase tracking-[0.12em] text-white ring-white/30 shadow-sm" variant="inverse">
                        {t('promo')}
                    </Badge>
                )}
            </div>

            {restaurant.distance !== undefined && restaurant.distance !== null && (
                <Badge
                    className="absolute bottom-3 right-3 border-white/70 bg-white/92 text-xs font-semibold text-slate-900 shadow-sm backdrop-blur-sm dark:bg-slate-900/92 dark:text-slate-100"
                    leading={<MapPin size={12} className="text-[var(--color-brand)]" aria-hidden="true" />}
                    variant="neutral"
                >
                    {formatDistance(restaurant.distance)}
                </Badge>
            )}
        </div>
    );

    const renderMeta = () => (
        <div className="space-y-2 p-4">
            <div className="flex min-w-0 items-start justify-between gap-2">
                <h3 className="min-w-0 break-words text-lg font-black leading-tight tracking-[-0.02em] text-[var(--color-text)]">{restaurant.name}</h3>
            </div>

            <p className="break-words text-sm leading-snug text-slate-500 dark:text-slate-400">{categoryNames}</p>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500 md:text-xs dark:text-slate-400">
                <Badge leading={<Clock size={10} className="text-[var(--color-brand)]" />} variant="neutral">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                        {typeof etaMinutes === 'number' && etaMinutes > 0
                            ? `${etaMinutes}-${etaMinutes + 10} min`
                            : t('etaPending')}
                    </span>
                </Badge>
                <Badge leading={<span className="font-bold text-[var(--color-brand)]">₡</span>} variant="neutral">
                    <span>
                        {typeof finalPriceEstimate === 'number' && finalPriceEstimate > 0
                            ? `${finalPriceEstimate.toLocaleString()} ${t('approx')}`
                            : t('pricePending')}
                    </span>
                </Badge>
                <Badge leading={<Truck size={10} className="text-[var(--color-brand)]" />} variant="neutral">
                    <span>
                        {typeof deliveryFeeHint === 'number' && deliveryFeeHint > 0
                            ? `₡${deliveryFeeHint.toLocaleString()}`
                            : t('free')}
                    </span>
                </Badge>
                <Badge
                    leading={hasRating ? <Star size={10} className="fill-amber-400 text-amber-400" aria-hidden="true" /> : undefined}
                    variant="warning"
                >
                    <span>{ratingLabel}</span>
                </Badge>
                <Badge leading={<ShieldCheck size={10} className="text-emerald-500" />} variant="success">
                    <span className="font-bold uppercase tracking-tighter text-[8px]">{t('trusted')}</span>
                </Badge>
            </div>
        </div>
    );

    return (
        <button
            type="button"
            onClick={handleClick}
            className="group w-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white text-left shadow-sm ring-1 ring-slate-100 transition-[box-shadow,transform,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_20px_40px_-24px_rgba(98,60,29,0.34)] active:scale-[0.995] motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-800"
            aria-label={t('viewMenuAria', { name: restaurant.name })}
        >
            {renderMedia()}
            {renderMeta()}
        </button>
    );
}
