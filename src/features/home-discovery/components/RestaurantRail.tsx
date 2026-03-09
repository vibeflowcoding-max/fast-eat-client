import React from 'react';
import { RestaurantWithBranches } from '@/types';
import RestaurantCard from '@/components/RestaurantCard';
import HomeErrorState from './HomeErrorState';
import HomeRailSkeleton from './HomeRailSkeleton';
import { emitHomeEvent } from '../analytics';
import { HOME_VISUAL_TOKENS } from './homeVisualTokens';
import { useTranslations } from 'next-intl';
import { Button, Surface } from '@/../resources/components';

type RailEmptyVariant = 'default' | 'query' | 'intent_or_filter' | 'nearby';

interface RailAction {
    label: string;
    analyticsAction: 'clear_search' | 'clear_filters' | 'broaden_radius' | 'retry';
    onClick?: () => void;
}

interface RestaurantRailProps {
    railId: string;
    title: string;
    subtitle?: string;
    restaurants: RestaurantWithBranches[];
    loading?: boolean;
    error?: string | null;
    onRetry?: () => void;
    onRestaurantOpen?: (restaurant: RestaurantWithBranches, rank: number) => void;
    visualHierarchyV2?: boolean;
    statePolishV1?: boolean;
    personalizedRail?: boolean;
    emptyVariant?: RailEmptyVariant;
    onEmptyAction?: () => void;
    onErrorFallback?: () => void;
}

function getRailState(params: { loading?: boolean; error?: string | null; hasData: boolean }) {
    if (params.loading) {
        return 'loading' as const;
    }

    if (params.error) {
        return 'error' as const;
    }

    if (!params.hasData) {
        return 'empty' as const;
    }

    return 'success' as const;
}

function isTransientNavigationError(error: string | null | undefined) {
    if (!error) {
        return false;
    }

    const normalized = error.toLowerCase();
    return normalized.includes('abort') || normalized.includes('signal is aborted');
}

function getEmptyStateConfig(variant: RailEmptyVariant, t: ReturnType<typeof useTranslations>): { message: string; action?: Omit<RailAction, 'onClick'> } {
    if (variant === 'query') {
        return {
            message: t('empty.query'),
            action: { label: t('empty.queryAction'), analyticsAction: 'clear_search' }
        };
    }

    if (variant === 'intent_or_filter') {
        return {
            message: t('empty.intent'),
            action: { label: t('empty.intentAction'), analyticsAction: 'clear_filters' }
        };
    }

    if (variant === 'nearby') {
        return {
            message: t('empty.nearby'),
            action: { label: t('empty.nearbyAction'), analyticsAction: 'broaden_radius' }
        };
    }

    return {
        message: t('empty.default'),
        action: { label: t('empty.defaultAction'), analyticsAction: 'retry' }
    };
}

export default function RestaurantRail({
    railId,
    title,
    subtitle,
    restaurants,
    loading,
    error,
    onRetry,
    onRestaurantOpen,
    visualHierarchyV2 = false,
    statePolishV1 = false,
    personalizedRail = false,
    emptyVariant = 'default',
    onEmptyAction,
    onErrorFallback
}: RestaurantRailProps) {
    const t = useTranslations('home.restaurantRail');
    React.useEffect(() => {
        if (restaurants.length === 0) {
            return;
        }

        emitHomeEvent({
            name: 'rail_impression',
            rail_id: railId,
            item_count: restaurants.length
        });

        if (personalizedRail) {
            emitHomeEvent({
                name: 'personalized_rail_impression',
                rail_id: railId,
                item_count: restaurants.length
            });
        }
    }, [railId, restaurants.length, personalizedRail]);

    const railState = getRailState({
        loading,
        error,
        hasData: restaurants.length > 0
    });

    const emptyStateConfig = getEmptyStateConfig(emptyVariant, t);

    const handleRetry = () => {
        emitHomeEvent({
            name: 'rail_error_retry_click',
            rail_id: railId
        });
        onRetry?.();
    };

    const handleErrorFallback = () => {
        emitHomeEvent({
            name: 'rail_empty_state_action_click',
            rail_id: railId,
            action: 'clear_filters'
        });
        onErrorFallback?.();
    };

    const handleEmptyAction = () => {
        if (!emptyStateConfig.action) {
            return;
        }

        emitHomeEvent({
            name: 'rail_empty_state_action_click',
            rail_id: railId,
            action: emptyStateConfig.action.analyticsAction
        });
        onEmptyAction?.();
    };

    const renderEmptyState = () => {
        if (!statePolishV1) {
            return (
                <Surface className="rounded-[1.75rem] border border-dashed border-slate-200 py-8 text-center dark:border-slate-700" variant="base">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('empty.default')}</p>
                </Surface>
            );
        }

        return (
            <Surface className="rounded-[1.75rem] border border-dashed border-slate-200 px-4 py-6 text-center dark:border-slate-700" variant="base">
                <p className="text-sm text-slate-500 dark:text-slate-400">{emptyStateConfig.message}</p>
                {emptyStateConfig.action && onEmptyAction && (
                    <Button
                        onClick={handleEmptyAction}
                        className="mt-3 min-h-[44px] rounded-full px-4"
                        size="sm"
                        variant="outline"
                    >
                        {emptyStateConfig.action.label}
                    </Button>
                )}
            </Surface>
        );
    };

    const renderState = () => {
        if (railState === 'loading') {
            return <HomeRailSkeleton />;
        }

        if (railState === 'error') {
            const safeErrorMessage = isTransientNavigationError(error) ? null : error;

            if (!statePolishV1) {
                return <HomeErrorState message={safeErrorMessage || t('error.loadSection')} onRetry={onRetry} />;
            }

            return (
                <HomeErrorState
                    title={t('error.title')}
                    message={safeErrorMessage || t('error.retryInSeconds')}
                    onRetry={onRetry ? handleRetry : undefined}
                    fallbackLabel={onErrorFallback ? t('error.clearFilters') : undefined}
                    onFallback={onErrorFallback ? handleErrorFallback : undefined}
                />
            );
        }

        if (railState === 'empty') {
            return renderEmptyState();
        }

        return (
            <div
                className={visualHierarchyV2
                    ? 'flex gap-3 overflow-x-auto snap-x snap-proximity overscroll-x-contain pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:snap-none'
                    : 'flex gap-4 overflow-x-auto snap-x snap-proximity overscroll-x-contain pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:snap-none'}
            >
                {restaurants.map((restaurant, index) => (
                    <div
                        key={`${railId}-${restaurant.id}`}
                        className="w-[280px] shrink-0 snap-start sm:w-auto sm:shrink sm:snap-none"
                    >
                        <RestaurantCard
                            restaurant={restaurant}
                            onOpen={(openedRestaurant) => onRestaurantOpen?.(openedRestaurant, index + 1)}
                        />
                    </div>
                ))}
            </div>
        );
    };

    return (
        <section
            className={visualHierarchyV2 ? HOME_VISUAL_TOKENS.sectionSpacing : 'mb-8'}
            aria-labelledby={`${railId}-title`}
        >
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h2
                        id={`${railId}-title`}
                        className={visualHierarchyV2 ? HOME_VISUAL_TOKENS.titleStyle : 'text-lg font-semibold text-gray-900'}
                    >
                        {title}
                    </h2>
                    {subtitle && (
                        <p className={visualHierarchyV2 ? HOME_VISUAL_TOKENS.subtitleStyle : 'text-sm text-gray-500'}>
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {renderState()}
        </section>
    );
}
