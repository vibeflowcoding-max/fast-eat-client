import React from 'react';
import { RestaurantInfo } from '../types';

interface HeroProps {
    restaurantInfo: RestaurantInfo | null;
}

const Hero: React.FC<HeroProps> = ({ restaurantInfo }) => {
    return (
        <div className="h-[20vh] md:h-[45vh] w-full relative overflow-hidden">
            <img
                src="https://images.unsplash.com/photo-1579027989536-b7b1f875659b?auto=format&fit=crop&q=80&w=1600"
                className="w-full h-full object-cover"
                alt="Hero"
            />
            <div className="absolute inset-0 hero-overlay flex flex-col items-center justify-center text-white text-center p-4">
                <span className="text-red-500 text-xl md:text-5xl mb-1 md:mb-4 font-bold tracking-widest">
                    {restaurantInfo ? "RESTAURANTE" : ""}
                </span>
                <h1 className="text-3xl md:text-8xl font-black tracking-tighter uppercase">
                    {restaurantInfo?.name || ""}
                </h1>
                <p className="text-[10px] md:text-2xl font-light italic tracking-[0.2em] opacity-90">
                    {restaurantInfo?.description || ""}
                </p>
            </div>
        </div>
    );
};

export default Hero;
