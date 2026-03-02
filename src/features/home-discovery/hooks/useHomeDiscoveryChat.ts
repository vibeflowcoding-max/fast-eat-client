import { useCallback, useEffect, useRef, useState } from 'react';
import { emitHomeEvent } from '../analytics';
import { discoveryClient } from '../services/discoveryClient';
import { getHomeDiscoveryHistory, getHomeDiscoverySessionId, setHomeDiscoveryHistory } from '../utils/discoveryStorage';
import { ChatHistoryItem, CompareOptions, DiscoveryChatResponse, LocationContext, UserConstraints } from '../types';
import { useCartStore } from '@/store';
import { normalizeLocale } from '@/i18n/config';

interface UseHomeDiscoveryChatOptions {
    location?: LocationContext;
    constraints?: UserConstraints;
}

export function useHomeDiscoveryChat({ location, constraints }: UseHomeDiscoveryChatOptions = {}) {
    const locale = useCartStore((state) => state.locale);
    const resolvedLocale = normalizeLocale(locale);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [history, setHistory] = useState<ChatHistoryItem[]>([]);
    const [lastResponse, setLastResponse] = useState<DiscoveryChatResponse | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        setHistory(getHomeDiscoveryHistory());
    }, []);

    useEffect(() => {
        setHomeDiscoveryHistory(history);
    }, [history]);

    useEffect(() => () => {
        abortControllerRef.current?.abort();
    }, []);

    const sendMessage = useCallback(async (query: string) => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery || loading) {
            return;
        }

        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const nextHistory: ChatHistoryItem[] = [...history, { role: 'user', content: trimmedQuery }];
        setHistory(nextHistory);
        setInputValue('');
        setLoading(true);
        emitHomeEvent({ name: 'home_chat_query' });

        try {
            const response = await discoveryClient.chat(
                {
                    sessionId: getHomeDiscoverySessionId(),
                    locale: resolvedLocale,
                    query: trimmedQuery,
                    history: nextHistory,
                    location,
                    constraints,
                    surface: 'home'
                },
                controller.signal
            );

            setLastResponse(response);
            setHistory((currentHistory) => [...currentHistory, { role: 'assistant', content: response.answer }]);
        } catch {
            setHistory((currentHistory) => [
                ...currentHistory,
                {
                    role: 'assistant',
                    content:
                        resolvedLocale === 'en-US'
                            ? 'I could not process your request right now. Please try again in a few seconds.'
                            : 'No pude procesar tu solicitud en este momento. Intenta de nuevo en unos segundos.'
                }
            ]);
        } finally {
            setLoading(false);
        }
    }, [constraints, history, loading, location, resolvedLocale]);

    const openChat = useCallback(() => {
        setIsOpen(true);
        emitHomeEvent({ name: 'home_chat_open' });
    }, []);

    const closeChat = useCallback(() => {
        setIsOpen(false);
    }, []);

    const setCompareOptions = useCallback((): CompareOptions | undefined => {
        return lastResponse?.compareOptions;
    }, [lastResponse]);

    return {
        isOpen,
        openChat,
        closeChat,
        loading,
        inputValue,
        setInputValue,
        history,
        sendMessage,
        recommendations: lastResponse?.recommendations ?? [],
        followUps: lastResponse?.followUps ?? [],
        compareOptions: setCompareOptions(),
        traceId: lastResponse?.traceId
    };
}
