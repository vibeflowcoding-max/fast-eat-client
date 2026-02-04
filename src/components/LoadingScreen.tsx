import React from 'react';

interface LoadingScreenProps {
    restaurantName?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ restaurantName }) => {
    return (
        <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center justify-center">
            <div className="text-red-600 text-7xl animate-pulse mb-6">禅</div>
            <p className="text-gray-900 font-black tracking-widest animate-pulse uppercase text-xs">
                Preparando {restaurantName || "el Menú"}...
            </p>
        </div>
    );
};

export default LoadingScreen;
