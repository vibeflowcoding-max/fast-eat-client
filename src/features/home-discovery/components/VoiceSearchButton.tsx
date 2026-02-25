import React from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { useVoiceOrdering } from '../hooks/useVoiceOrdering';
import { useTranslations } from 'next-intl';

export default function VoiceSearchButton() {
    const t = useTranslations('home.voiceSearch');
    const { isListening, isProcessing, transcript, startListening, stopListening } = useVoiceOrdering();

    return (
        <div className="relative flex items-center">
            <button
                type="button"
                onMouseDown={startListening}
                onMouseUp={stopListening}
                onTouchStart={startListening}
                onTouchEnd={stopListening}
                disabled={isProcessing}
                className={`flex items-center justify-center p-2 rounded-xl transition-all duration-300 ${isListening ? 'bg-red-500 text-white animate-pulse scale-110 shadow-lg shadow-red-500/30' : 'bg-transparent text-gray-400 hover:text-black hover:bg-gray-100'}`}
                title={t('holdToOrderTitle')}
            >
                {isProcessing ? <Loader2 size={18} className="animate-spin text-orange-500" /> : isListening ? <Mic size={18} /> : <Mic size={18} />}
            </button>

            {(isListening || isProcessing || (transcript && transcript !== t('listening'))) && (
                <div className="absolute top-full right-0 mt-3 w-64 bg-gray-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl z-[60] text-xs font-medium text-center border border-white/10 animate-fadeIn">
                    <div className="absolute -top-1.5 right-4 w-3 h-3 bg-gray-900/95 border-l border-t border-white/10 transform rotate-45"></div>
                    {isProcessing ? t('processing') : isListening ? t('listeningHint') : transcript}
                </div>
            )}
        </div>
    );
}
