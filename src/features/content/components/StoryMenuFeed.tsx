"use client";

import React, { useState, useRef, useEffect } from 'react';
import StoryVideoPlayer, { StoryVideoItem } from './StoryVideoPlayer';
import { Clapperboard } from 'lucide-react';

const MOCK_STORIES: StoryVideoItem[] = [
    {
        id: 's1',
        restaurantId: 'r1',
        restaurantName: 'La Casona',
        itemName: 'Casado con Carne',
        price: 3500,
        videoUrl: 'https://cdn.pixabay.com/video/2015/08/08/212-135732709_tiny.mp4', // Placeholder food video
        description: 'Nuestro plato estrella: arroz, frijoles, plátano maduro, ensalada y una jugosa carne arreglada. ¡Sabor casero!'
    },
    {
        id: 's2',
        restaurantId: 'r2',
        restaurantName: 'Sushi Go',
        itemName: 'Volcano Roll',
        price: 4500,
        videoUrl: 'https://cdn.pixabay.com/video/2020/05/11/38600-422849504_tiny.mp4',
        description: 'Bañado en salsa anguila y mayonesa spicy. Cubierto con flakes de tempura. ¡Explosión de sabor!'
    },
    {
        id: 's3',
        restaurantId: 'r3',
        restaurantName: 'La Pizzería del Barrio',
        itemName: 'Pizza Suprema',
        price: 6000,
        videoUrl: 'https://cdn.pixabay.com/video/2024/02/21/201402-915494200_tiny.mp4',
        description: 'Queso mozzarella derretido, pepperoni crujiente, hongos frescos y extra salsa de tomate artesanal.'
    }
];

export default function StoryMenuFeed() {
    const [activeStoryId, setActiveStoryId] = useState<string>(MOCK_STORIES[0].id);
    const [isMuted, setIsMuted] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                // Find the video that is currently most visible
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        const storyId = entry.target.getAttribute('data-story-id');
                        if (storyId && storyId !== activeStoryId) {
                            setActiveStoryId(storyId);
                        }
                    }
                });
            },
            {
                root: container,
                threshold: 0.5, // Trigger when 50% of the video is visible
            }
        );

        const children = container.querySelectorAll('.story-container');
        children.forEach((child) => observer.observe(child));

        return () => {
            children.forEach((child) => observer.unobserve(child));
        };
    }, [activeStoryId]);

    return (
        <div className="w-full mb-8">
            <div className="flex items-center gap-2 mb-4 px-1">
                <Clapperboard className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Story Menus</h3>
            </div>

            {/* Snap Scrolling Container */}
            <div
                ref={containerRef}
                className="flex overflow-x-auto gap-4 snap-x snap-mandatory hide-scrollbar px-1 pb-4"
                style={{ scrollBehavior: 'smooth' }}
            >
                {MOCK_STORIES.map((story) => (
                    <div
                        key={story.id}
                        data-story-id={story.id}
                        className="story-container w-[280px] h-[450px] sm:w-[320px] sm:h-[500px] flex-shrink-0 snap-center rounded-3xl overflow-hidden shadow-lg relative"
                    >
                        <StoryVideoPlayer
                            item={story}
                            isActive={story.id === activeStoryId}
                            isMuted={isMuted}
                            onToggleMute={() => setIsMuted(prev => !prev)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
