"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { RestaurantWithBranches } from '@/types';
import { formatDistance } from '@/utils/geoUtils';
import { MapPin, Star } from 'lucide-react';

interface RestaurantCardProps {
    restaurant: RestaurantWithBranches;
    onOpen?: (restaurant: RestaurantWithBranches) => void;
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

    // Get the first active branch for display
    const primaryBranch = restaurant.branches?.[0];
    const imageUrl = primaryBranch?.image_url || restaurant.logo_url || '/placeholder-restaurant.svg';
    const categoryNames = restaurant.categories?.map(c => c.name).join(', ') || 'Restaurante';
    const metricErrors = getMetricErrors(restaurant);
    const hasMetricErrors = metricErrors.length > 0;
    const etaMinutes = restaurant.eta_min;
    const finalPriceEstimate = restaurant.avg_price_estimate;
    const rating = restaurant.rating;
    const reviewCount = restaurant.review_count;
    const hasPromo = Boolean(restaurant.promo_text);
    const deliveryFeeHint = restaurant.estimated_delivery_fee;
    const reviewConfidence = reviewConfidenceLabel(reviewCount);
    const hasRating = typeof rating === 'number' && !Number.isNaN(rating) && rating > 0;

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
                        Promo
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
                {hasRating && (
                    <div className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-800">
                        <Star size={12} className="fill-gray-800 text-gray-800" aria-hidden="true" />
                        <span>{rating.toFixed(1)}</span>
                    </div>
                )}
            </div>

            <p className="truncate text-sm text-gray-500">{categoryNames}</p>

            {hasMetricErrors ? (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-xs text-red-700">
                    <p className="font-semibold">Error de datos de restaurante</p>
                    <p className="mt-1">Faltan métricas obligatorias: {metricErrors.join(', ')}.</p>
                </div>
            ) : (
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
                    {typeof etaMinutes === 'number' && etaMinutes > 0 && (
                        <>
                            <span className="font-medium">{etaMinutes}-{etaMinutes + 10} min</span>
                            <span className="text-gray-300">•</span>
                        </>
                    )}
                    <span>
                        {typeof deliveryFeeHint === 'number' && deliveryFeeHint > 0
                            ? `₡${deliveryFeeHint.toLocaleString()} envío`
                            : 'Envío a confirmar'}
                    </span>
                    {reviewCount && reviewCount > 0 && (
                        <>
                            <span className="text-gray-300">•</span>
                            <span>{reviewCount}+ reseñas</span>
                        </>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <button
            type="button"
            onClick={handleClick}
            className="group w-full overflow-hidden rounded-2xl bg-white text-left shadow-sm transition-[box-shadow,transform] duration-200 ease-out hover:shadow-md active:scale-[0.995] motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            aria-label={`Ver menú de ${restaurant.name}`}
        >
            {renderMedia()}
            {renderMeta()}
        </button>
    );
}
