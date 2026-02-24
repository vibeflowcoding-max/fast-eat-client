import React, { useEffect, useState } from 'react';

export default function DynamicPromoBanner() {
    const [promo, setPromo] = useState('');
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Mock AI-generated context-aware promo based on time/weather rules
        setTimeout(() => {
            const hour = new Date().getHours();
            if (hour < 11) {
                setPromo('☕ ¡Buenos días! 15% off en desayunos para empezar el día con energía.');
            } else if (hour > 18) {
                setPromo('🌙 La cena está lista. Descubre las promos exclusivas de esta noche.');
            } else {
                setPromo('🔥 Promo Relámpago: 10% off en tu próximo pedido usando IA10');
            }
        }, 1200);
    }, []);

    if (!isVisible || !promo) return null;

    return (
        <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 mb-4 rounded-2xl shadow-lg flex items-center justify-between animate-fadeIn text-white border border-white/10">
            <p className="text-xs md:text-sm font-bold leading-snug tracking-wide">{promo}</p>
            <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsVisible(false); }}
                className="ml-3 shrink-0 bg-white/20 hover:bg-white/30 rounded-full w-6 h-6 flex items-center justify-center transition-colors text-xs font-bold cursor-pointer z-10"
            >
                <span className="pointer-events-none">✕</span>
            </button>
        </div>
    );
}
