import React from 'react';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { DiscoveryIntent } from '../types';

interface IntentChipsBarProps {
    intents: Array<{ id: DiscoveryIntent; label: string }>;
    activeIntent: DiscoveryIntent | null;
    onIntentChange: (intent: DiscoveryIntent | null) => void;
    disabled?: boolean;
    showAllOption?: boolean;
    allLabel?: string;
    children?: React.ReactNode;
}

export default function IntentChipsBar({
    intents,
    activeIntent,
    onIntentChange,
    disabled,
    showAllOption = false,
    allLabel = 'Todos',
    children,
    onOpenFilters
}: IntentChipsBarProps & { onOpenFilters?: () => void }) {
    const scrollRef = React.useRef<HTMLDivElement | null>(null);

    const scrollChips = React.useCallback((direction: 'left' | 'right') => {
        if (!scrollRef.current) {
            return;
        }

        scrollRef.current.scrollBy({
            left: direction === 'left' ? -180 : 180,
            behavior: 'smooth'
        });
    }, []);

    return (
        <div className="px-4 pb-3">
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => scrollChips('left')}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600"
                    aria-label="Desplazar secciones a la izquierda"
                >
                    <ChevronLeft size={16} />
                </button>

                <div ref={scrollRef} className="overflow-x-auto flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex min-w-max items-center gap-2">
                        {showAllOption && (
                            <button
                                key="all"
                                type="button"
                                disabled={disabled}
                                onClick={() => onIntentChange(null)}
                                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                                    activeIntent === null
                                        ? 'bg-orange-500 text-white border-orange-500'
                                        : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
                                } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                                aria-pressed={activeIntent === null}
                            >
                                {allLabel}
                            </button>
                        )}

                        {intents.map((intent) => {
                            const isActive = activeIntent === intent.id;

                            return (
                                <button
                                    key={intent.id}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onIntentChange(isActive ? null : intent.id)}
                                    className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                                        isActive
                                            ? 'bg-orange-500 text-white border-orange-500'
                                            : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
                                    } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    aria-pressed={isActive}
                                >
                                    {intent.label}
                                </button>
                            );
                        })}
                        
                        {children && (
                            <>
                                <div className="w-px h-6 bg-gray-300 mx-1" />
                                {children}
                            </>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => scrollChips('right')}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600"
                    aria-label="Desplazar secciones a la derecha"
                >
                    <ChevronRight size={16} />
                </button>

                {onOpenFilters && (
                    <>
                        <div className="w-px h-6 bg-gray-200 mx-1" />
                        <button
                            type="button"
                            onClick={onOpenFilters}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            aria-label="Filtros y orden"
                        >
                            <SlidersHorizontal size={16} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
