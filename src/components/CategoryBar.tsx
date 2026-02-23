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
            <div className="flex gap-4 px-4 py-3 min-w-max">
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
                        Todos
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
                            {category.name}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
