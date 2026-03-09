import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PlannerPage from './page';

const { push, fetchPlannerRecommendations } = vi.hoisted(() => ({
  push: vi.fn(),
  fetchPlannerRecommendations: vi.fn(),
}));

const mockState = {
  dietaryProfile: {
    diet: 'vegetarian',
    allergies: ['mani'],
  },
  isAuthenticated: true,
};

vi.mock('@/services/api', () => ({
  fetchPlannerRecommendations,
}));

vi.mock('@/hooks/useAppRouter', () => ({
  useAppRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/store', () => ({
  useCartStore: () => mockState,
}));

vi.mock('@/components/BottomNav', () => ({
  default: () => <div>bottom-nav</div>,
}));

describe('PlannerPage', () => {
  beforeEach(() => {
    push.mockReset();
    fetchPlannerRecommendations.mockReset();
    mockState.isAuthenticated = true;
    mockState.dietaryProfile = { diet: 'vegetarian', allergies: ['mani'] };
  });

  it('shows the auth fallback without requesting recommendations', () => {
    mockState.isAuthenticated = false;

    render(<PlannerPage />);

    expect(screen.getByText('Necesitas iniciar sesión para usar recomendaciones personalizadas.')).toBeInTheDocument();
    expect(fetchPlannerRecommendations).not.toHaveBeenCalled();
  });

  it('loads recommendations automatically and supports follow-up actions', async () => {
    fetchPlannerRecommendations.mockResolvedValue({
      generatedAt: '2026-03-08T10:00:00.000Z',
      inputs: {
        budget: 7000,
        serviceMode: 'delivery',
        searchTerms: [],
        dietaryProfile: {
          allergies: ['mani'],
          preferences: ['vegetarian'],
          strictness: 'strict',
        },
      },
      recommendations: [
        {
          restaurant: { id: 'rest-1', name: 'Sumo Sushi' },
          item: {
            id: 'item-1',
            name: 'Bowl veggie',
            description: 'Recomendacion ligera con proteina vegetal.',
            price: 6450,
            variantId: 'variant-1',
          },
          rationale: ['Sin mani', 'Dentro de presupuesto'],
          score: 91,
          cartSeed: {
            restaurantId: 'rest-1',
            branchId: 'branch-1',
            items: [],
          },
        },
      ],
    });

    render(<PlannerPage />);

    await waitFor(() => {
      expect(fetchPlannerRecommendations).toHaveBeenCalledWith({
        budget: 7000,
        serviceMode: 'delivery',
        mood: 'comfort',
        limit: 6,
      });
    });

    expect(await screen.findByText('Bowl veggie')).toBeInTheDocument();
    expect(screen.getByText('Sumo Sushi')).toBeInTheDocument();
    expect(screen.getByText('Sin mani')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ajustar perfil' }));
    expect(push).toHaveBeenCalledWith('/profile');

    fireEvent.click(screen.getByRole('button', { name: 'Ver restaurante' }));
    expect(push).toHaveBeenCalledWith('/restaurant/rest-1');

    fireEvent.click(screen.getByRole('button', { name: 'Healthy Opciones más ligeras y balanceadas.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pickup Busca ideas que tengan más sentido para recoger en tienda.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generar recomendaciones' }));

    await waitFor(() => {
      expect(fetchPlannerRecommendations).toHaveBeenLastCalledWith({
        budget: 7000,
        serviceMode: 'pickup',
        mood: 'healthy',
        limit: 6,
      });
    });
  });
});