import {
    CompareRequest,
    CompareResponse,
    DiscoveryChatRequest,
    DiscoveryChatResponse,
    DiscoveryRecommendationsRequest,
    DiscoveryRecommendationsResponse,
    RecommendationItem
} from '../types';

const DEFAULT_TIMEOUT_MS = 8000;
const MAX_RETRIES = 1;

function createTraceId() {
    return `home-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function fetchWithTimeout<T>(
    url: string,
    body: unknown,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = MAX_RETRIES,
    signal?: AbortSignal,
    traceId = createTraceId()
) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const abortHandler = () => controller.abort();
    signal?.addEventListener('abort', abortHandler);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-trace-id': traceId
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }

        return (await response.json()) as T;
    } catch (error) {
        if (retries > 0 && !controller.signal.aborted) {
            return fetchWithTimeout<T>(url, body, timeoutMs, retries - 1, signal, traceId);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', abortHandler);
    }
}

function fallbackRecommendation(title: string, restaurantId: string): RecommendationItem {
    return {
        kind: 'restaurant',
        id: `fallback-${restaurantId}`,
        restaurantId,
        title,
        score: 0.5,
        reasons: ['Recomendación rápida basada en tu consulta']
    };
}

export const discoveryClient = {
    async chat(request: DiscoveryChatRequest, signal?: AbortSignal): Promise<DiscoveryChatResponse> {
        try {
            return await fetchWithTimeout<DiscoveryChatResponse>('/api/discovery/chat', request, DEFAULT_TIMEOUT_MS, MAX_RETRIES, signal);
        } catch {
            return {
                answer: 'No pude consultar recomendaciones en tiempo real. Te muestro una guía rápida para continuar.',
                recommendations: [fallbackRecommendation('Explorar restaurantes cercanos', 'nearby')],
                followUps: ['¿Buscas algo económico?', '¿Prefieres entrega rápida?', '¿Quieres comparar opciones?'],
                traceId: 'fallback-chat'
            };
        }
    },
    async recommendations(
        request: DiscoveryRecommendationsRequest,
        signal?: AbortSignal
    ): Promise<DiscoveryRecommendationsResponse> {
        return fetchWithTimeout<DiscoveryRecommendationsResponse>(
            '/api/discovery/recommendations',
            request,
            DEFAULT_TIMEOUT_MS,
            MAX_RETRIES,
            signal
        );
    },
    async compare(request: CompareRequest, signal?: AbortSignal): Promise<CompareResponse> {
        try {
            return await fetchWithTimeout<CompareResponse>('/api/discovery/compare', request, DEFAULT_TIMEOUT_MS, MAX_RETRIES, signal);
        } catch {
            return {
                comparison: {
                    title: 'Comparación rápida',
                    options: []
                },
                traceId: 'fallback-compare',
                strategyVersion: 'fallback-v1'
            };
        }
    }
};
