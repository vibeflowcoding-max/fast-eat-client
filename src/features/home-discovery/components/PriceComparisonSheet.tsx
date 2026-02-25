import React from 'react';
import { CompareOption } from '../types';
import { useTranslations } from 'next-intl';

interface PriceComparisonSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    options: CompareOption[];
    source: 'rail' | 'chat';
    onSelectOption?: (restaurantId: string) => void;
    loading?: boolean;
    error?: string | null;
}

export default function PriceComparisonSheet({
    open,
    onOpenChange,
    options,
    onSelectOption,
    loading,
    error
}: PriceComparisonSheetProps) {
    const t = useTranslations('home.priceComparison');

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50">
            <button
                type="button"
                className="absolute inset-0 bg-black/45"
                onClick={() => onOpenChange(false)}
                aria-label={t('closeAria')}
            />

            <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl p-4 max-h-[75vh] overflow-y-auto">
                <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
                <h3 className="text-base font-semibold text-gray-900">{t('title')}</h3>
                <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>

                {loading ? (
                    <p className="text-sm text-gray-500 py-6">{t('loading')}</p>
                ) : error ? (
                    <p className="text-sm text-red-600 py-6">{error}</p>
                ) : options.length === 0 ? (
                    <p className="text-sm text-gray-500 py-6">{t('empty')}</p>
                ) : (
                    <div className="mt-4 space-y-3">
                        {options.map((option) => (
                            <button
                                key={option.restaurantId}
                                type="button"
                                onClick={() => onSelectOption?.(option.restaurantId)}
                                className="w-full text-left border border-gray-200 rounded-xl p-3 hover:border-orange-300"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="font-medium text-gray-900">{option.label}</p>
                                    <p className="text-orange-600 font-semibold">₡{Math.round(option.finalPrice).toLocaleString()}</p>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {t('base')} ₡{Math.round(option.basePrice).toLocaleString()} · {t('delivery')} ₡{Math.round(option.deliveryFee).toLocaleString()} ·
                                    {t('discount')} ₡{Math.round(option.discount).toLocaleString()}
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
