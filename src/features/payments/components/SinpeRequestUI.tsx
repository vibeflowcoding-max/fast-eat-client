"use client";

import React, { useState } from 'react';
import { Copy, Check, MessageCircle, Smartphone, Info } from 'lucide-react';
import { SplitResult } from '../utils/splitStrategies';

interface SinpeRequestUIProps {
    splitResults: SplitResult[];
    hostPhone: string;
    hostName: string;
    onBack: () => void;
    onClose: () => void;
}

export default function SinpeRequestUI({
    splitResults,
    hostPhone,
    hostName,
    onBack,
    onClose
}: SinpeRequestUIProps) {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const formatCurrency = (val: number) => `₡${val.toLocaleString()}`;

    const handleCopyMessage = (result: SplitResult) => {
        const message = `¡Hola ${result.participantName}! Tu parte de la cuenta en FastEat es de ${formatCurrency(result.finalTotal)}. Por favor, pasalo por SINPE al ${hostPhone} a nombre de ${hostName}. ¡Gracias! 🍣🍱`;
        navigator.clipboard.writeText(message);
        setCopiedId(result.participantId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSendWhatsApp = (result: SplitResult) => {
        const message = encodeURIComponent(`¡Hola ${result.participantName}! Tu parte de la cuenta en FastEat es de ${formatCurrency(result.finalTotal)}. Por favor, pasalo por SINPE al ${hostPhone} a nombre de ${hostName}. ¡Gracias! 🍣🍱`);
        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-5 md:p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <Smartphone className="w-6 h-6 text-red-500" />
                            Cobrar por SINPE
                        </h3>
                        <p className="text-sm text-gray-500 font-medium">Comparte el resumen con tus amigos</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 font-bold hover:bg-gray-100 transition-colors border border-gray-200">✕</button>
                </div>

                <div className="flex-grow overflow-y-auto p-5 md:p-6 space-y-4 bg-gray-50">
                    <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-2 shadow-sm border border-blue-100">
                        <p className="font-bold flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Instrucciones para el organizador
                        </p>
                        <p className="mt-1 opacity-90">
                            Usa los botones para copiar el mensaje o enviarlo directamente por WhatsApp a cada participante.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {splitResults.map((result) => {
                            if (result.finalTotal <= 0) return null;

                            return (
                                <div key={result.participantId} className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm">
                                    <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-3">
                                        <p className="font-bold text-gray-900 text-lg">{result.participantName}</p>
                                        <div className="text-xl font-black text-red-600">
                                            {formatCurrency(result.finalTotal)}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleSendWhatsApp(result)}
                                            className="flex-1 py-2.5 bg-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 transition-colors focus:ring-4 focus:ring-green-100 active:scale-95"
                                        >
                                            <MessageCircle className="w-5 h-5" />
                                            <span className="text-xs uppercase tracking-wider">WhatsApp</span>
                                        </button>
                                        <button
                                            onClick={() => handleCopyMessage(result)}
                                            className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors focus:ring-4 focus:ring-gray-100 active:scale-95"
                                            title="Copiar texto"
                                        >
                                            {copiedId === result.participantId ? (
                                                <Check className="w-5 h-5 text-green-600" />
                                            ) : (
                                                <Copy className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-5 md:p-6 border-t border-gray-100 bg-white grid grid-cols-2 gap-3">
                    <button
                        onClick={onBack}
                        className="w-full py-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors uppercase tracking-widest text-xs active:scale-95"
                    >
                        Atrás
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-4 rounded-xl font-black text-white bg-black hover:bg-gray-800 transition-colors uppercase tracking-widest text-xs shadow-xl active:scale-95"
                    >
                        Listo ⛩️
                    </button>
                </div>
            </div>
        </div>
    );
}
