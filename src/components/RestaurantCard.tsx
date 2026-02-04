"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { RestaurantWithBranches } from '@/types';
import { formatDistance } from '@/utils/geoUtils';
import { MapPin, Clock } from 'lucide-react';

interface RestaurantCardProps {
    restaurant: RestaurantWithBranches;
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
    const router = useRouter();

    // Get the first active branch for display
    const primaryBranch = restaurant.branches?.[0];
    const imageUrl = primaryBranch?.image_url || restaurant.logo_url || '/placeholder-restaurant.png';
    const categoryNames = restaurant.categories?.map(c => c.name).join(', ') || 'Restaurante';

    const handleClick = () => {
        // Navigate to the restaurant menu using the slug
        if (restaurant.slug) {
            router.push(`/${restaurant.slug}`);
        } else if (primaryBranch?.code) {
            router.push(`/${primaryBranch.code}`);
        }
    };

    return (
        <button
            onClick={handleClick}
            className="w-full bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden text-left group"
        >
            {/* Image */}
            <div className="relative h-40 overflow-hidden">
                <img
                    src={imageUrl}
                    alt={restaurant.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-restaurant.png';
                    }}
                />
                {/* Distance badge */}
                {restaurant.distance !== undefined && restaurant.distance !== null && (
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <MapPin size={12} className="text-orange-500" />
                        <span>{formatDistance(restaurant.distance)}</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">
                    {restaurant.name}
                </h3>
                <p className="text-sm text-gray-500 mb-2 truncate">
                    {categoryNames}
                </p>

                {/* Location */}
                {primaryBranch && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={12} />
                        <span className="truncate">
                            {primaryBranch.human_addres || primaryBranch.city || 'Ver ubicación'}
                        </span>
                    </div>
                )}
            </div>
        </button>
    );
}
