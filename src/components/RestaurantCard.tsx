"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { RestaurantWithBranches } from '@/types';
import { formatDistance } from '@/utils/geoUtils';
import { MapPin, Star, Clock, Truck, ShieldCheck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

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

function reviewConfidenceLabel(reviewCount?: number | null) {
    if (!reviewCount || reviewCount < 25) return 'Baja';
    if (reviewCount < 90) return 'Media';
    return 'Alta';
}

function getMetricErrors(restaurant: RestaurantWithBranches) {
    const errors: string[] = [];

    if (typeof restaurant.eta_min !== 'number' || Number.isNaN(restaurant.eta_min) || restaurant.eta_min <= 0) {
        errors.push('ETA no disponible');
    }

    if (typeof restaurant.avg_price_estimate !== 'number' || Number.isNaN(restaurant.avg_price_estimate) || restaurant.avg_price_estimate <= 0) {
        errors.push('Total estimado no disponible');
    }

    return errors;
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
    const reviewCount = restaurant.review_count;
    const hasPromo = Boolean(restaurant.promo_text);
    const deliveryFeeHint = primaryBranch?.estimated_delivery_fee ?? restaurant.estimated_delivery_fee;
    const reviewConfidence = reviewConfidenceLabel(reviewCount);
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
        <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
            <img
                src={imageUrl}
                alt={`Imagen de ${restaurant.name}`}
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
                    <span className="inline-flex min-h-5 items-center rounded-md bg-orange-500 px-2 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                        {t('promo')}
                    </span>
                )}
            </div>

            {restaurant.distance !== undefined && restaurant.distance !== null && (
                <div className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2 py-1 text-xs font-medium text-gray-700">
                    <span className="inline-flex items-center gap-1">
                        <MapPin size={12} className="text-orange-500" aria-hidden="true" />
                        {formatDistance(restaurant.distance)}
                    </span>
                </div>
            )}
        </div>
    );

    const renderMeta = () => (
        <div className="space-y-1 p-3">
            <div className="flex items-start justify-between gap-2">
                <h3 className="truncate text-lg font-bold text-gray-900">{restaurant.name}</h3>
            </div>

            <p className="truncate text-sm text-gray-500">{categoryNames}</p>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] md:text-xs text-gray-500 font-medium">
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                    <Clock size={10} className="text-gray-400" />
                    <span className="text-gray-900 font-bold">
                        {typeof etaMinutes === 'number' && etaMinutes > 0
                            ? `${etaMinutes}-${etaMinutes + 10} min`
                            : t('etaPending')}
                    </span>
                </div>
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                    <span className="text-gray-400 font-bold">₡</span>
                    <span>
                        {typeof finalPriceEstimate === 'number' && finalPriceEstimate > 0
                            ? `${finalPriceEstimate.toLocaleString()} ${t('approx')}`
                            : t('pricePending')}
                    </span>
                </div>
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                    <Truck size={10} className="text-gray-400" />
                    <span>
                        {typeof deliveryFeeHint === 'number' && deliveryFeeHint > 0
                            ? `₡${deliveryFeeHint.toLocaleString()}`
                            : t('free')}
                    </span>
                </div>
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                    {hasRating && <Star size={10} className="text-amber-400 fill-amber-400" aria-hidden="true" />}
                    <span>{ratingLabel}</span>
                </div>
                <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md text-emerald-700">
                    <ShieldCheck size={10} className="text-emerald-500" />
                    <span className="font-bold uppercase tracking-tighter text-[8px]">{t('trusted')}</span>
                </div>
            </div>
        </div>
    );

    return (
        <button
            type="button"
            onClick={handleClick}
            className="group w-full overflow-hidden rounded-2xl bg-white text-left shadow-sm transition-[box-shadow,transform] duration-200 ease-out hover:shadow-md active:scale-[0.995] motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            aria-label={t('viewMenuAria', { name: restaurant.name })}
        >
            {renderMedia()}
            {renderMeta()}
        </button>
    );
}
