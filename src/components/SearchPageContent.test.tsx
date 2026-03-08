import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SearchPageContent from './SearchPageContent';

const fetchMock = vi.fn();

const mockCategories = [
  { id: 'cat-1', name: 'Sushi' },
  { id: 'cat-2', name: 'Pizza' },
];

const mockRestaurants = [
  {
    id: 'rest-1',
    name: 'Sumo Sushi',
    categories: [{ id: 'cat-1', name: 'Sushi' }],
    promo_text: '2x1',
    eta_min: 25,
    rating: 4.8,
    avg_price_estimate: 5500,
  },
  {
    id: 'rest-2',
    name: 'Pizza Lab',
    categories: [{ id: 'cat-2', name: 'Pizza' }],
    promo_text: null,
    eta_min: 45,
    rating: 4.2,
    avg_price_estimate: 8500,
  },
];

const translations: Record<string, string> = {
  title: 'Buscar',
  subtitle: 'Encuentra restaurantes y antojos rápidamente.',
  searchPlaceholder: 'Buscar restaurantes o comida',
  searchButton: 'Buscar',
  aiSuggestions: 'Sugerencias IA',
  aiDefaultMessage: 'Prueba algo nuevo cerca de ti.',
  aiGenerating: 'Generando sugerencias...',
  aiEmpty: 'Sin sugerencias por ahora',
  recentSearches: 'Búsquedas recientes',
  recentSearchesEmpty: 'Aún no tienes búsquedas recientes',
  filterByCategory: 'Filtrar por categoría',
  allCategories: 'Todas',
  quickFilters: 'Filtros rápidos',
  results: 'Resultados',
  loadingRestaurants: 'Cargando restaurantes...',
  emptyResults: 'No encontramos restaurantes con estos filtros.',
  'intents.promotions': 'Promos',
  'intents.fast': 'Rápidos',
  'intents.bestRated': 'Mejor valorados',
  'intents.cheap': 'Económicos',
};

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => translations[key] ?? key,
}));

vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({ categories: mockCategories }),
}));

vi.mock('@/hooks/useRestaurants', () => ({
  useRestaurants: () => ({ restaurants: mockRestaurants, loading: false, error: null }),
}));

vi.mock('@/store', () => ({
  useCartStore: () => ({ userLocation: null, fromNumber: '50688888888', customerName: 'Ivan' }),
}));

vi.mock('@/components/BottomNav', () => ({
  default: () => <div>bottom-nav</div>,
}));

vi.mock('@/components/RestaurantCard', () => ({
  default: ({ restaurant }: { restaurant: { name: string } }) => <div>{restaurant.name}</div>,
}));

describe('SearchPageContent', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/search/recent?')) {
        return { ok: true, json: async () => ({ recentSearches: [] }) } as Response;
      }
      if (url.includes('/api/search/ai-suggestions')) {
        return {
          ok: true,
          json: async () => ({ assistantMessage: 'Te recomiendo algo ligero.', suggestions: [{ type: 'query', value: 'ramen', label: 'Ramen' }] }),
        } as Response;
      }
      if (url.includes('/api/search/recent')) {
        return { ok: true, json: async () => ({ ok: true }) } as Response;
      }
      throw new Error(`Unhandled fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock as typeof fetch);
  });

  it('renders restaurants and lets users filter by category', async () => {
    render(<SearchPageContent />);

    expect(await screen.findByText('Sumo Sushi')).toBeInTheDocument();
    expect(screen.getByText('Pizza Lab')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sushi' }));

    expect(screen.getByText('Sumo Sushi')).toBeInTheDocument();
    expect(screen.queryByText('Pizza Lab')).not.toBeInTheDocument();
  });

  it('applies AI query suggestions to the search input', async () => {
    render(<SearchPageContent />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ramen' })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ramen' }));
    });

    expect(screen.getByRole('textbox', { name: 'Buscar restaurantes o comida' })).toHaveValue('ramen');
  });
});