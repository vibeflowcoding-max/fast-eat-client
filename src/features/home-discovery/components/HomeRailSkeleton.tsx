import React from 'react';

interface HomeRailSkeletonProps {
    itemCount?: number;
}

export default function HomeRailSkeleton({ itemCount = 3 }: HomeRailSkeletonProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 motion-safe:animate-pulse" role="status" aria-live="polite" aria-label="Cargando restaurantes">
            {Array.from({ length: itemCount }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                    <div className="aspect-[16/9] w-full bg-gray-200" />
                    <div className="space-y-3 p-4">
                        <div className="h-5 w-2/3 rounded bg-gray-200" />
                        <div className="h-4 w-1/2 rounded bg-gray-100" />
                        <div className="grid grid-cols-2 gap-2">
                            <div className="h-10 rounded-lg bg-gray-100" />
                            <div className="h-10 rounded-lg bg-gray-100" />
                            <div className="h-10 rounded-lg bg-gray-100" />
                            <div className="h-10 rounded-lg bg-gray-100" />
                        </div>
                    </div>
                    <div className="border-t border-gray-100 px-4 py-3">
                        <div className="h-10 w-full rounded-xl bg-gray-200" />
                    </div>
                </div>
            ))}
        </div>
    );
}
