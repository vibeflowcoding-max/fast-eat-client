import React from 'react';

const MenuSkeleton: React.FC = () => {
    return (
        <div className="bg-white rounded-[2.5rem] overflow-hidden border-2 border-gray-100 shadow-sm animate-pulse">
            {/* Image Skeleton */}
            <div className="h-48 md:h-64 bg-gray-200 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
            </div>

            {/* Content Skeleton */}
            <div className="p-6 md:p-8 space-y-4">
                <div className="flex justify-between items-start">
                    <div className="h-6 bg-gray-200 rounded-lg w-2/3"></div>
                    <div className="h-6 bg-gray-100 rounded-lg w-1/4"></div>
                </div>

                <div className="space-y-2">
                    <div className="h-3 bg-gray-100 rounded-lg w-full"></div>
                    <div className="h-3 bg-gray-100 rounded-lg w-5/6"></div>
                </div>

                <div className="pt-4">
                    <div className="w-full h-12 md:h-14 bg-gray-200 rounded-2xl"></div>
                </div>
            </div>
        </div>
    );
};

export default MenuSkeleton;
