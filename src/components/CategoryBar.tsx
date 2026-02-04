"use client";

import React from 'react';
import { RestaurantCategory } from '@/types';

interface CategoryBarProps {
    categories: RestaurantCategory[];
    selectedCategoryId: string | null;
    onSelectCategory: (categoryId: string | null) => void;
}

export default function CategoryBar({ categories, selectedCategoryId, onSelectCategory }: CategoryBarProps) {
    return (
        <div className="w-full overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 px-4 py-3 min-w-max">
                {/* All categories button */}
                <button
                    onClick={() => onSelectCategory(null)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${selectedCategoryId === null
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    <span>🍽️</span>
                    <span>Todos</span>
                </button>

                {/* Category buttons */}
                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => onSelectCategory(category.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${selectedCategoryId === category.id
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
