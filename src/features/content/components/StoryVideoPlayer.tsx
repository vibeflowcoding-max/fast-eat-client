"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Volume2, VolumeX, Plus, Play, Pause } from 'lucide-react';
import { useCartStore } from '@/store';
import { CartItem } from '@/types';

export interface StoryVideoItem {
    id: string;
    restaurantId: string;
    restaurantName: string;
    itemName: string;
    price: number;
    videoUrl: string;
    description: string;
}

interface StoryVideoPlayerProps {
    item: StoryVideoItem;
    isActive: boolean;
    isMuted: boolean;
    onToggleMute: () => void;
}

export default function StoryVideoPlayer({
    item,
    isActive,
    isMuted,
    onToggleMute
}: StoryVideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isAdded, setIsAdded] = useState(false);

    const addToCart = useCartStore(state => state.updateItem);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isActive) {
            video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            video.currentTime = 0;
        } else {
            video.pause();
            setIsPlaying(false);
        }
    }, [isActive]);

    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video) return;
        setProgress((video.currentTime / video.duration) * 100);
    };

    const handleVideoClick = () => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.pause();
            setIsPlaying(false);
        } else {
            video.play().then(() => setIsPlaying(true)).catch(() => { });
        }
    };

    const handleAddToCart = (e: React.MouseEvent) => {
        e.stopPropagation();

        const cartItem: CartItem = {
            id: item.id,
            name: item.itemName,
            description: item.description,
            price: item.price,
            category: 'Video Menu',
            quantity: 1,
            image: '', // Can be a thumbnail if needed
            notes: ''
        };

        addToCart(cartItem);
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 2000);
    };

    const formatCurrency = (val: number) => `₡${val.toLocaleString()}`;

    return (
        <div className="relative w-full h-full bg-black snap-center flex-shrink-0 flex items-center justify-center overflow-hidden rounded-3xl group">
            {/* Video Element */}
            <video
                ref={videoRef}
                src={item.videoUrl}
                loop
                muted={isMuted}
                playsInline
                onTimeUpdate={handleTimeUpdate}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                onClick={handleVideoClick}
            />

            {/* Overlay Gradients */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

            {/* Progress Bar */}
            <div className="absolute top-4 left-4 right-4 h-1 bg-white/30 rounded-full overflow-hidden z-10">
                <div
                    className="h-full bg-white transition-all duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Mute Toggle */}
            <button
                onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
                className="absolute top-8 right-4 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white z-20 hover:bg-black/60 transition"
            >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Play/Pause Indicator (Fades out) */}
            {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="w-20 h-20 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-80">
                        <Play className="w-8 h-8 ml-1" />
                    </div>
                </div>
            )}

            {/* Information & Action Footer */}
            <div className="absolute bottom-6 left-5 right-5 z-20">
                <div className="flex items-end justify-between">
                    <div className="flex-1 mr-4">
                        <h3 className="text-white font-black text-2xl drop-shadow-md mb-1 leading-tight">{item.itemName}</h3>
                        <p className="text-red-400 font-bold text-sm mb-2 drop-shadow flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse"></span>
                            {item.restaurantName}
                        </p>
                        <p className="text-white/80 text-xs line-clamp-2 drop-shadow-sm pr-4">
                            {item.description}
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-3">
                        <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full font-black text-white text-sm border border-white/20">
                            {formatCurrency(item.price)}
                        </div>

                        <button
                            onClick={handleAddToCart}
                            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all transform active:scale-90 z-30 ${isAdded ? 'bg-green-500 text-white' : 'bg-red-500 text-white hover:bg-red-600'}`}
                            aria-label="Agregar al carrito"
                        >
                            <Plus className={`w-6 h-6 transition-transform ${isAdded ? 'rotate-45 hidden' : ''}`} />
                            {isAdded && <span className="font-bold text-xs uppercase">✓</span>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
