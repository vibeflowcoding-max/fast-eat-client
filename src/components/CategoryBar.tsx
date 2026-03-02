"use client";

import React from 'react';
import { RestaurantCategory } from '@/types';
import { useLocale, useTranslations } from 'next-intl';

interface CategoryBarProps {
    categories: RestaurantCategory[];
    selectedCategoryId: string | null;
    onSelectCategory: (categoryId: string | null) => void;
}

const CATEGORY_EN_MAP: Record<string, string> = {
    'todos': 'All',
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
    'comida rápida': 'Fast Food',
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

export default function CategoryBar({ categories, selectedCategoryId, onSelectCategory }: CategoryBarProps) {
    const locale = useLocale();
    const t = useTranslations('home.categoryBar');
    const isEnglish = locale.toLowerCase().startsWith('en');

    const getCategoryLabel = React.useCallback((name: string) => {
        if (!isEnglish) {
            return name;
        }

        const normalized = normalizeCategoryName(name);
        return CATEGORY_EN_MAP[normalized] ?? name;
    }, [isEnglish]);

    return (
        <div className="w-full overflow-x-auto scrollbar-hide">
            <div className="flex gap-4 px-4 pt-3 pb-4 min-w-max">
                {/* All categories button */}
                <button
                    onClick={() => onSelectCategory(null)}
                    className="flex flex-col items-center gap-1 min-w-[64px]"
                >
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl transition-all ${
                        selectedCategoryId === null
                            ? 'bg-orange-100 ring-2 ring-orange-500 ring-offset-2'
                            : 'bg-gray-100 hover:bg-gray-200'
                    }`}>
                        🍽️
                    </div>
                    <span className={`text-xs font-medium ${selectedCategoryId === null ? 'text-orange-600' : 'text-gray-600'}`}>
                        {t('all')}
                    </span>
                </button>

                {/* Category buttons */}
                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => onSelectCategory(category.id)}
                        className="flex flex-col items-center gap-1 min-w-[64px]"
                    >
                        <div className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl transition-all ${
                            selectedCategoryId === category.id
                                ? 'bg-orange-100 ring-2 ring-orange-500 ring-offset-2'
                                : 'bg-gray-100 hover:bg-gray-200'
                        }`}>
                            {category.icon}
                        </div>
                        <span className={`text-xs font-medium ${selectedCategoryId === category.id ? 'text-orange-600' : 'text-gray-600'}`}>
                            {getCategoryLabel(category.name)}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
