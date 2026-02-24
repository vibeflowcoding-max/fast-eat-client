import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type SuggestionAction =
  | { type: 'query'; value: string; label: string }
  | { type: 'category'; value: string; label: string }
  | { type: 'intent'; value: 'promotions' | 'fast' | 'best_rated' | 'cheap'; label: string };

type RequestBody = {
  query?: string;
  categories?: Array<{ id: string; name: string }>;
  recentSearches?: string[];
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function buildSystemPrompt(query: string, categories: string[], recentSearches: string[]) {
  return [
    'You are a food delivery search copilot.',
    'Return concise JSON only in this format:',
    '{"assistantMessage": string, "suggestions": [{"type":"query|category|intent", "value": string, "label": string}]}',
    'Allowed intent values: promotions, fast, best_rated, cheap.',
    `Current user query: ${query || '(empty)'}`,
    `Known categories: ${categories.join(', ') || '(none)'}`,
    `Recent searches pattern: ${recentSearches.join(' | ') || '(none)'}`,
    'Give at most 8 suggestions prioritizing user patterns and delivery-app intents.'
  ].join('\n');
}

function mapIntentLabel(intent: 'promotions' | 'fast' | 'best_rated' | 'cheap'): string {
  switch (intent) {
    case 'promotions':
      return 'Solo promos';
    case 'fast':
      return 'Cerca de mí';
    case 'best_rated':
      return 'Mejor calidad';
    case 'cheap':
      return 'Económico';
    default:
      return intent;
  }
}

function fallbackSuggestions(query: string, categories: Array<{ id: string; name: string }>, recentSearches: string[]): SuggestionAction[] {
  const normalizedQuery = normalize(query);
  const suggestions: SuggestionAction[] = [];

  const frequentTokens = recentSearches
    .flatMap((term) => normalize(term).split(/\s+/g))
    .filter((token) => token.length >= 4)
    .reduce<Map<string, number>>((acc, token) => {
      acc.set(token, (acc.get(token) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());

  const topFrequent = [...frequentTokens.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([token]) => token);

  for (const token of topFrequent) {
    suggestions.push({
      type: 'query',
      value: token,
      label: `Buscar ${token}`
    });
  }

  const matchingCategories = categories
    .filter((category) => normalize(category.name).includes(normalizedQuery) || normalizedQuery.includes(normalize(category.name)))
    .slice(0, 3);

  for (const category of matchingCategories) {
    suggestions.push({
      type: 'category',
      value: category.id,
      label: category.name
    });
  }

  (['promotions', 'fast', 'best_rated', 'cheap'] as const).forEach((intent) => {
    suggestions.push({
      type: 'intent',
      value: intent,
      label: mapIntentLabel(intent)
    });
  });

  const unique = new Map<string, SuggestionAction>();
  for (const suggestion of suggestions) {
    unique.set(`${suggestion.type}:${suggestion.value}`, suggestion);
  }

  return [...unique.values()].slice(0, 8);
}

function parseAiSuggestionPayload(raw: unknown): { assistantMessage: string; suggestions: SuggestionAction[] } | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const input = raw as { assistantMessage?: unknown; suggestions?: unknown };

  const parsedSuggestions: SuggestionAction[] = Array.isArray(input.suggestions)
    ? input.suggestions
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return null;
          }

          const parsed = item as { type?: unknown; value?: unknown; label?: unknown };
          if (typeof parsed.type !== 'string' || typeof parsed.value !== 'string' || typeof parsed.label !== 'string') {
            return null;
          }

          if (parsed.type !== 'query' && parsed.type !== 'category' && parsed.type !== 'intent') {
            return null;
          }

          if (parsed.type === 'intent') {
            if (!['promotions', 'fast', 'best_rated', 'cheap'].includes(parsed.value)) {
              return null;
            }

            return {
              type: 'intent',
              value: parsed.value as 'promotions' | 'fast' | 'best_rated' | 'cheap',
              label: parsed.label
            } as SuggestionAction;
          }

          return {
            type: parsed.type,
            value: parsed.value,
            label: parsed.label
          } as SuggestionAction;
        })
        .filter(Boolean) as SuggestionAction[]
    : [];

  return {
    assistantMessage: typeof input.assistantMessage === 'string' ? input.assistantMessage : 'Sugerencias personalizadas para ti',
    suggestions: parsedSuggestions.slice(0, 8)
  };
}

async function callAiProvider(payload: { systemPrompt: string; query: string }) {
  const webhookUrl = process.env.N8N_DISCOVERY_WEBHOOK_URL;
  if (!webhookUrl) {
    return null;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mode: 'search_suggestions',
      systemPrompt: payload.systemPrompt,
      userInput: payload.query
    })
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  if (typeof data?.output === 'string') {
    try {
      return JSON.parse(data.output);
    } catch {
      return null;
    }
  }

  return data;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;
    const query = typeof body.query === 'string' ? body.query : '';
    const categories = Array.isArray(body.categories) ? body.categories : [];
    const recentSearches = Array.isArray(body.recentSearches)
      ? body.recentSearches.filter((value): value is string => typeof value === 'string').slice(0, 5)
      : [];

    const systemPrompt = buildSystemPrompt(
      query,
      categories.map((category) => category.name),
      recentSearches
    );

    let aiResult: { assistantMessage: string; suggestions: SuggestionAction[] } | null = null;

    try {
      const providerPayload = await callAiProvider({ systemPrompt, query });
      aiResult = parseAiSuggestionPayload(providerPayload);
    } catch {
      aiResult = null;
    }

    const fallback = fallbackSuggestions(query, categories, recentSearches);

    return NextResponse.json({
      systemPrompt,
      assistantMessage: aiResult?.assistantMessage ?? 'Explora estas ideas según tus búsquedas recientes',
      suggestions: aiResult?.suggestions?.length ? aiResult.suggestions : fallback
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not generate search suggestions' },
      { status: 500 }
    );
  }
}
