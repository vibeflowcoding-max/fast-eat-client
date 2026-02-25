import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';

export const useVoiceOrdering = () => {
    const t = useTranslations('home.voiceSearch');
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const startListening = useCallback(() => {
        setIsListening(true);
        setTranscript('');
        // Mock recording logic
        setTimeout(() => {
            setTranscript(t('listening'));
        }, 500);
    }, [t]);

    const stopListening = useCallback(() => {
        setIsListening(false);
        setIsProcessing(true);
        // Mock API call to STT -> LLM -> Cart
        setTimeout(() => {
            setIsProcessing(false);
            setTranscript(t('addedToCart'));
        }, 2000);
    }, [t]);

    return {
        isListening,
        isProcessing,
        transcript,
        startListening,
        stopListening
    };
};
