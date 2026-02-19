import React from 'react';
import { RestaurantWithBranches } from '@/types';
import RestaurantCard from '@/components/RestaurantCard';
import HomeErrorState from './HomeErrorState';
import HomeRailSkeleton from './HomeRailSkeleton';
import { emitHomeEvent } from '../analytics';
import { HOME_VISUAL_TOKENS } from './homeVisualTokens';

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

function getEmptyStateConfig(variant: RailEmptyVariant): { message: string; action?: Omit<RailAction, 'onClick'> } {
    if (variant === 'query') {
        return {
            message: 'No encontramos resultados para tu búsqueda actual.',
            action: { label: 'Limpiar búsqueda', analyticsAction: 'clear_search' }
        };
    }

    if (variant === 'intent_or_filter') {
        return {
            message: 'No hay resultados con los filtros o intención seleccionados.',
            action: { label: 'Quitar filtros', analyticsAction: 'clear_filters' }
        };
    }

    if (variant === 'nearby') {
        return {
            message: 'No encontramos restaurantes cercanos por ahora.',
            action: { label: 'Ampliar búsqueda', analyticsAction: 'broaden_radius' }
        };
    }

    return {
        message: 'No hay resultados para esta sección.',
        action: { label: 'Reintentar', analyticsAction: 'retry' }
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

    const emptyStateConfig = getEmptyStateConfig(emptyVariant);

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
                <div className="text-center py-8 border border-dashed border-gray-200 rounded-2xl bg-white">
                    <p className="text-sm text-gray-500">No hay resultados para esta sección.</p>
                </div>
            );
        }

        return (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-6 text-center">
                <p className="text-sm text-gray-600">{emptyStateConfig.message}</p>
                {emptyStateConfig.action && onEmptyAction && (
                    <button
                        type="button"
                        onClick={handleEmptyAction}
                        className="mt-3 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
                    >
                        {emptyStateConfig.action.label}
                    </button>
                )}
            </div>
        );
    };

    const renderState = () => {
        if (railState === 'loading') {
            return <HomeRailSkeleton />;
        }

        if (railState === 'error') {
            if (!statePolishV1) {
                return <HomeErrorState message={error || 'No pudimos cargar esta sección.'} onRetry={onRetry} />;
            }

            return (
                <HomeErrorState
                    title="No pudimos actualizar esta sección"
                    message={error || 'Inténtalo de nuevo en unos segundos.'}
                    onRetry={onRetry ? handleRetry : undefined}
                    fallbackLabel={onErrorFallback ? 'Quitar filtros' : undefined}
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
