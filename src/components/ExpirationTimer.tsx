import React from 'react';

interface ExpirationTimerProps {
    timeLeftStr: string;
}

const ExpirationTimer: React.FC<ExpirationTimerProps> = ({ timeLeftStr }) => {
    return (
        <div className="fixed bottom-28 left-4 md:top-24 md:bottom-auto md:right-8 md:left-auto z-[60] animate-fadeIn pointer-events-none">
            <div className="bg-black/90 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-2 md:gap-3 pointer-events-auto transition-transform hover:scale-105">
                <div className="flex flex-col">
                    <span className="text-[6px] md:text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none">Vence en:</span>
                    <span className="text-xs md:text-sm font-black text-red-500 font-mono tracking-tighter">{timeLeftStr}</span>
                </div>
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-red-600/20 flex items-center justify-center">
                    <span className="text-[10px] md:text-xs animate-pulse">⏳</span>
                </div>
            </div>
        </div>
    );
};

export default ExpirationTimer;
