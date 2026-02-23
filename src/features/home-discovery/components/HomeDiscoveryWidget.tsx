"use client";

import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { useHomeDiscoveryChat } from '../hooks/useHomeDiscoveryChat';
import { LocationContext, UserConstraints } from '../types';
import { emitHomeEvent } from '../analytics';
import ChatInput from '@/components/ChatInput';

interface HomeDiscoveryWidgetProps {
    enabled: boolean;
    location?: LocationContext;
    constraints?: UserConstraints;
    onRecommendationClick?: (restaurantId: string) => void;
}

const QUICK_PROMPTS = [
    'Algo barato para hoy',
    'Combo familiar',
    'Lo más rápido cerca',
    'Opciones saludables'
];

export default function HomeDiscoveryWidget({
    enabled,
    location,
    constraints,
    onRecommendationClick
}: HomeDiscoveryWidgetProps) {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const {
        isOpen,
        openChat,
        closeChat,
        loading,
        inputValue,
        setInputValue,
        history,
        recommendations,
        followUps,
        traceId,
        sendMessage
    } = useHomeDiscoveryChat({ location, constraints });

    React.useEffect(() => {
        if (!isOpen) {
            return;
        }

        inputRef.current?.focus();
    }, [isOpen]);

    React.useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeChat();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [closeChat, isOpen]);

    if (!enabled) {
        return null;
    }

    return (
        <>
            {isOpen && (
                <div
                    className="fixed bottom-20 right-4 left-4 sm:left-auto sm:w-[380px] z-50 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden"
                    role="dialog"
                    aria-label="Asistente de descubrimiento"
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <div>
                            <p className="text-sm font-semibold text-gray-900">Asistente de descubrimiento</p>
                            <p className="text-xs text-gray-500">Encuentra mejores opciones antes de elegir restaurante</p>
                        </div>
                        <button type="button" onClick={closeChat} className="p-1 text-gray-500 hover:text-gray-700" aria-label="Cerrar asistente">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-3 space-y-3 max-h-[52vh] overflow-y-auto bg-gray-50" aria-live="polite">
                        {history.length === 0 && (
                            <div className="flex flex-wrap gap-2">
                                {QUICK_PROMPTS.map((prompt) => (
                                    <button
                                        key={prompt}
                                        type="button"
                                        className="text-xs px-2.5 py-1.5 rounded-full bg-white border border-gray-200"
                                        onClick={() => {
                                            emitHomeEvent({ name: 'home_chat_quick_prompt_click', label: prompt });
                                            sendMessage(prompt);
                                        }}
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {history.map((message, index) => (
                            <div
                                key={`${message.role}-${index}`}
                                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                                    message.role === 'user'
                                        ? 'ml-auto bg-orange-500 text-white'
                                        : 'mr-auto bg-white border border-gray-200 text-gray-800'
                                }`}
                            >
                                {message.content}
                            </div>
                        ))}

                        {recommendations.length > 0 && (
                            <div className="space-y-2">
                                {recommendations.slice(0, 3).map((recommendation) => (
                                    <div key={recommendation.id} className="bg-white border border-gray-200 rounded-xl p-3">
                                        <p className="text-sm font-medium text-gray-900">{recommendation.title}</p>
                                        {recommendation.subtitle && <p className="text-xs text-gray-500">{recommendation.subtitle}</p>}
                                        <div className="flex items-center gap-2 mt-2">
                                            <button
                                                type="button"
                                                className="text-xs px-2 py-1 rounded-lg bg-orange-500 text-white"
                                                onClick={() => {
                                                    emitHomeEvent({ name: 'home_chat_recommendation_click', trace_id: traceId });
                                                    onRecommendationClick?.(recommendation.restaurantId);
                                                }}
                                            >
                                                Ver restaurante
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {followUps.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {followUps.map((followUp) => (
                                    <button
                                        key={followUp}
                                        type="button"
                                        onClick={() => {
                                            emitHomeEvent({ name: 'home_chat_followup_click', label: followUp });
                                            sendMessage(followUp);
                                        }}
                                        className="text-xs px-2 py-1 rounded-lg bg-white border border-gray-200"
                                    >
                                        {followUp}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <ChatInput
                        onSend={sendMessage}
                        isTyping={loading}
                        value={inputValue}
                        onValueChange={setInputValue}
                        inputRef={inputRef}
                        inputAriaLabel="Mensaje para asistente de descubrimiento"
                        placeholder="Ej. quiero algo barato con envío rápido"
                        containerClassName="p-3 border-t border-gray-100 bg-white"
                        inputClassName="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                        buttonClassName="px-3 py-2 rounded-xl bg-orange-500 text-white disabled:opacity-60 min-w-[78px] text-sm"
                    />
                </div>
            )}

            <button
                type="button"
                onClick={openChat}
                className="fixed z-40 bottom-20 right-4 px-4 py-3 rounded-full shadow-lg bg-orange-500 text-white flex items-center gap-2"
                aria-label="Abrir asistente de descubrimiento"
            >
                <Sparkles size={16} />
                <span className="text-sm font-medium">Asistente</span>
            </button>
        </>
    );
}
