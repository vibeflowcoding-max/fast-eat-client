"use client";

import React, { useState, useEffect } from 'react';
import { Search, MapPin } from 'lucide-react';
import { useCartStore } from '@/store';
import { useCategories } from '@/hooks/useCategories';
import { useRestaurants } from '@/hooks/useRestaurants';
import CategoryBar from '@/components/CategoryBar';
import RestaurantCard from '@/components/RestaurantCard';
import UserOnboardingModal from '@/components/UserOnboardingModal';
import LoadingScreen from '@/components/LoadingScreen';

export default function HomePage() {
    const { isOnboarded, userLocation, customerName } = useCartStore();
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { categories, loading: categoriesLoading } = useCategories();
    const { restaurants, loading: restaurantsLoading } = useRestaurants({
        categoryId: selectedCategoryId,
        userLocation
    });

    useEffect(() => {
        // Show onboarding if user hasn't completed it
        if (!isOnboarded) {
            setShowOnboarding(true);
        }
    }, [isOnboarded]);

    const handleOnboardingComplete = () => {
        setShowOnboarding(false);
    };

    // Filter restaurants by search query
    const filteredRestaurants = restaurants.filter((restaurant) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            restaurant.name.toLowerCase().includes(query) ||
            restaurant.categories?.some(c => c.name.toLowerCase().includes(query))
        );
    });

    // Separate nearby (within 5km) and far restaurants
    const nearbyRestaurants = filteredRestaurants.filter(
        r => r.distance !== undefined && r.distance !== null && r.distance <= 5
    );
    const otherRestaurants = filteredRestaurants.filter(
        r => r.distance === undefined || r.distance === null || r.distance > 5
    );

    if (categoriesLoading || restaurantsLoading) {
        return <LoadingScreen />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Onboarding Modal */}
            <UserOnboardingModal
                isOpen={showOnboarding}
                onComplete={handleOnboardingComplete}
            />

            {/* Header */}
            <header className="bg-white sticky top-0 z-40 shadow-sm">
                <div className="px-4 py-4">
                    {/* Greeting */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-gray-500 text-sm">
                                {customerName ? `Hola, ${customerName.split(' ')[0]}` : '¡Hola!'}
                            </p>
                            <h1 className="text-xl font-bold text-gray-900">
                                ¿Qué vas a comer hoy?
                            </h1>
                        </div>
                        {userLocation && (
                            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                <MapPin size={12} />
                                <span>Ubicación activa</span>
                            </div>
                        )}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar restaurantes o comida..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Category Bar */}
                <CategoryBar
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    onSelectCategory={setSelectedCategoryId}
                />
            </header>

            {/* Main Content */}
            <main className="px-4 py-6">
                {/* Nearby Section */}
                {nearbyRestaurants.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="text-orange-500">📍</span>
                            Cerca de ti
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {nearbyRestaurants.map((restaurant) => (
                                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                            ))}
                        </div>
                    </section>
                )}

                {/* All/Other Restaurants */}
                <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        {nearbyRestaurants.length > 0 ? 'Más restaurantes' : 'Restaurantes'}
                    </h2>
                    {otherRestaurants.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {otherRestaurants.map((restaurant) => (
                                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No se encontraron restaurantes</p>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
