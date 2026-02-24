'use client';

import React, { useState, useEffect } from 'react';
import { Clock, ArrowRight, X } from 'lucide-react';

interface PredictiveReorderResponse {
    should_prompt: boolean;
    confidence: number;
    restaurantId?: string;
    itemId?: string;
    prompt_message?: string;
}

interface PredictivePromptProps {
    onReorderClick?: (restaurantId: string, itemId: string) => void;
}

export default function PredictivePrompt({ onReorderClick }: PredictivePromptProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [prediction, setPrediction] = useState<PredictiveReorderResponse | null>(null);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // If already dismissed in this session, don't check again
        if (isDismissed) return;

        const checkPrediction = async () => {
            try {
                // In a real app, you would pass the actual user's order history from the database/store
                const mockOrderHistory = [
                    { restaurantId: '123', itemId: 'coffee-latte', timestamp: Date.now() - 86400000 } // yesterday
                ];

                const response = await fetch('/api/discovery/predictive-reorder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        order_history: mockOrderHistory,
                        current_time: new Date().toISOString(),
                        location: { lat: 9.9281, lng: -84.0907 }
                    })
                });

                if (!response.ok) return;

                const data: PredictiveReorderResponse = await response.json();

                if (data.should_prompt && data.confidence > 0.7 && data.restaurantId && data.itemId) {
                    setPrediction(data);
                    setIsVisible(true);
                }
            } catch (error) {
                console.error('[PredictivePrompt] Failed to fetch prediction:', error);
            }
        };

        checkPrediction();
    }, [isDismissed]);

    if (!isVisible || !prediction || !prediction.restaurantId || !prediction.itemId || isDismissed) {
        return null;
    }

    return (
        <div className="mx-4 mt-6 animate-in slide-in-from-top-4 fade-in duration-500">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 shadow-lg shadow-blue-900/20 relative overflow-hidden group">
                {/* Decorative background circle */}
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />

                <button
                    onClick={() => setIsDismissed(true)}
                    className="absolute top-2 right-2 p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0 border border-white/20">
                        <Clock className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-1">
                        <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-0.5">
                            Sugerencia para ti
                        </p>
                        <h3 className="text-white font-bold text-sm leading-snug">
                            {prediction.prompt_message || '¡Hora de repetir tu última orden!'}
                        </h3>
                    </div>

                    <button
                        onClick={() => onReorderClick?.(prediction.restaurantId!, prediction.itemId!)}
                        className="shrink-0 bg-white text-blue-600 w-10 h-10 rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
