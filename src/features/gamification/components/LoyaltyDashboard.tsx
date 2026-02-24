"use client";

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLoyaltyStore } from '../store/useLoyaltyStore';
import { Trophy, Star, TrendingUp, Presentation, Hexagon, X, Zap } from 'lucide-react';

interface LoyaltyDashboardProps {
    onClose: () => void;
}

export default function LoyaltyDashboard({ onClose }: LoyaltyDashboardProps) {
    const { points, currentStreak, longestStreak, badges, resetStreakIfExpired } = useLoyaltyStore();
    const [isMounted, setIsMounted] = React.useState(false);

    useEffect(() => {
        resetStreakIfExpired();
    }, [resetStreakIfExpired]);

    useEffect(() => {
        setIsMounted(true);
        return () => setIsMounted(false);
    }, []);

    const POINTS_PER_TIER = 2000;
    const currentTierProgress = (points % POINTS_PER_TIER) / POINTS_PER_TIER;
    const currentTier = Math.floor(points / POINTS_PER_TIER);

    const tierNames = ["Explorador", "Aficionado", "Conocedor", "Gourmet Local", "Maestro del Sabor"];
    const currentTierName = tierNames[Math.min(currentTier, tierNames.length - 1)];
    const nextTierName = tierNames[Math.min(currentTier + 1, tierNames.length - 1)];
    const pointsToNextTier = POINTS_PER_TIER - (points % POINTS_PER_TIER);

    const handleClose = React.useCallback(() => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fast-eat:close-loyalty'));
        }
        onClose();
    }, [onClose]);

    const handleCloseInteraction = React.useCallback((event: React.SyntheticEvent) => {
        event.preventDefault();
        event.stopPropagation();
        handleClose();
    }, [handleClose]);

    const handleBackdropClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            handleClose();
        }
    }, [handleClose]);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [handleClose]);

    if (!isMounted) {
        return null;
    }

    return createPortal(
        <div
            className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-md"
            onClick={handleBackdropClick}
        >
            <div
                className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] relative"
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={handleCloseInteraction}
                    onMouseDown={handleCloseInteraction}
                    onPointerDown={handleCloseInteraction}
                    onTouchEnd={handleCloseInteraction}
                    className="absolute top-6 right-6 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors z-50 cursor-pointer"
                    aria-label="Cerrar vista de puntos"
                >
                    <X className="w-5 h-5 pointer-events-none" />
                </button>

                <div className="flex-grow overflow-y-auto hide-scrollbar">
                    {/* Header Section */}
                    <div className="bg-gradient-to-br from-red-500 to-orange-500 p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 opacity-10 blur-2xl transform translate-x-1/2 -translate-y-1/2">
                            <Star className="w-64 h-64" />
                        </div>

                        <div className="relative z-10">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-red-100 mb-1">Tu Rango Actual</h2>
                            <div className="flex items-center gap-3 mb-6">
                                <Trophy className="w-8 h-8 text-yellow-300 fill-current" />
                                <h1 className="text-4xl font-black tracking-tight">{currentTierName}</h1>
                            </div>

                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <span className="text-3xl font-black">{points.toLocaleString()}</span>
                                        <span className="text-red-100 ml-1 font-medium">pts</span>
                                    </div>
                                    {currentTier < tierNames.length - 1 && (
                                        <div className="text-right text-xs font-medium text-red-100">
                                            Faltan {pointsToNextTier.toLocaleString()} pts para <br /> {nextTierName}
                                        </div>
                                    )}
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-black/20 rounded-full h-3 mt-4 overflow-hidden p-0.5">
                                    <div
                                        className="bg-gradient-to-r from-yellow-300 to-yellow-500 h-full rounded-full relative"
                                        style={{ width: `${Math.max(5, currentTierProgress * 100)}%` }}
                                    >
                                        <div className="absolute top-0 right-0 w-4 h-full bg-white/30 rounded-full skew-x-12 animate-pulse mx-1"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Streaks Section */}
                        <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-orange-500" />
                                Racha de Pedidos
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-2 shadow-inner">
                                        <Zap className="w-6 h-6 fill-current" />
                                    </div>
                                    <span className="text-2xl font-black text-gray-900">{currentStreak}</span>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Racha Actual</span>
                                </div>

                                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center mb-2 shadow-inner">
                                        <Presentation className="w-6 h-6" />
                                    </div>
                                    <span className="text-xl font-bold text-gray-900">{longestStreak}</span>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mejor Racha</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 text-center mt-3 font-medium">
                                Pide 1 vez más esta semana para mantener tu racha viva y ganar a multiplicadores.
                            </p>
                        </div>

                        {/* Badges Section */}
                        <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Hexagon className="w-4 h-4 text-purple-500" />
                                Insignias Obtenidas
                            </h3>

                            {badges.length > 0 ? (
                                <div className="grid grid-cols-3 gap-3">
                                    {badges.map(badge => (
                                        <div key={badge.id} className="bg-white border-2 border-gray-100 rounded-2xl p-3 flex flex-col items-center text-center shadow-sm hover:border-purple-200 hover:shadow-md transition-all group">
                                            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{badge.icon}</div>
                                            <span className="text-xs font-bold text-gray-900 leading-tight mb-1">{badge.name}</span>
                                            <span className="text-[9px] text-gray-400 font-medium">{new Date(badge.earnedAt).toLocaleDateString('es-CR')}</span>
                                        </div>
                                    ))}

                                    {/* Empty Slot for gamification */}
                                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center opacity-50">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                                            <span className="text-gray-400 text-lg font-black">?</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Sigue Explorando</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-6 rounded-2xl text-center border border-gray-100">
                                    <p className="text-gray-500 text-sm font-medium">Aún no tienes insignias. ¡Haz tu primer pedido para empezar a coleccionarlas!</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    , document.body
    );
}
