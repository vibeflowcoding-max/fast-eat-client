import { useState, useCallback } from 'react';

export const useVoiceOrdering = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const startListening = useCallback(() => {
        setIsListening(true);
        setTranscript('');
        // Mock recording logic
        setTimeout(() => {
            setTranscript('Escuchando...');
        }, 500);
    }, []);

    const stopListening = useCallback(() => {
        setIsListening(false);
        setIsProcessing(true);
        // Mock API call to STT -> LLM -> Cart
        setTimeout(() => {
            setIsProcessing(false);
            setTranscript('¡Entendido! Hemos agregado tu pedido al carrito. 🍔');
        }, 2000);
    }, []);

    return {
        isListening,
        isProcessing,
        transcript,
        startListening,
        stopListening
    };
};
