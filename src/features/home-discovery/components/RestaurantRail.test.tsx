import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RestaurantRail from './RestaurantRail';
import { emitHomeEvent } from '../analytics';

vi.mock('@/components/RestaurantCard', () => ({
  default: ({ onOpen, restaurant }: { onOpen?: (restaurant: any) => void; restaurant: any }) => (
    <button onClick={() => onOpen?.(restaurant)}>Open {restaurant.name}</button>
  )
}));

vi.mock('../analytics', () => ({
  emitHomeEvent: vi.fn()
}));

describe('RestaurantRail keyboard navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const restaurant = {
    id: 'r-1',
    name: 'Sushi Place',
    slug: 'sushi-place',
    logo_url: null,
    description: null,
    is_active: true,
    branches: [],
    categories: []
  };

  it('allows triggering restaurant open action using keyboard', async () => {
    const user = userEvent.setup();
    const onRestaurantOpen = vi.fn();

    render(
      <RestaurantRail
        railId="popular-now"
        title="Popular"
        restaurants={[restaurant as any]}
        onRestaurantOpen={onRestaurantOpen}
      />
    );

    const openButton = screen.getByRole('button', { name: 'Open Sushi Place' });
    openButton.focus();
    await user.keyboard('{Enter}');

    expect(onRestaurantOpen).toHaveBeenCalledTimes(1);
    expect(onRestaurantOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'r-1' }), 1);
  });

  it('keeps rail headings visible and ordered as level-2 headings', () => {
    render(
      <>
        <RestaurantRail
          railId="nearby"
          title="Restaurantes cercanos"
          subtitle="Opciones cerca de tu ubicación"
          restaurants={[restaurant as any]}
          visualHierarchyV2
        />
        <RestaurantRail
          railId="popular"
          title="Populares hoy"
          subtitle="Los más elegidos de la zona"
          restaurants={[restaurant as any]}
          visualHierarchyV2
        />
      </>
    );

    const headings = screen.getAllByRole('heading', { level: 2 });

    expect(headings).toHaveLength(2);
    expect(headings[0]).toHaveTextContent('Restaurantes cercanos');
    expect(headings[1]).toHaveTextContent('Populares hoy');
  });

  it('renders loading skeleton state', () => {
    render(
      <RestaurantRail
        railId="loading-rail"
        title="Cargando"
        restaurants={[] as any}
        loading
      />
    );

    expect(screen.getByRole('status', { name: 'Cargando restaurantes' })).toBeInTheDocument();
  });

  it('renders contextual empty state and emits empty action analytics', async () => {
    const user = userEvent.setup();
    const onEmptyAction = vi.fn();

    render(
      <RestaurantRail
        railId="empty-rail"
        title="Resultados"
        restaurants={[] as any}
        statePolishV1
        emptyVariant="query"
        onEmptyAction={onEmptyAction}
      />
    );

    expect(screen.getByText('No encontramos resultados para tu búsqueda actual.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));

    expect(onEmptyAction).toHaveBeenCalledTimes(1);
    expect(emitHomeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'rail_empty_state_action_click',
        rail_id: 'empty-rail',
        action: 'clear_search'
      })
    );
  });

  it('renders polished error state and supports retry + fallback actions', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onFallback = vi.fn();

    render(
      <RestaurantRail
        railId="error-rail"
        title="Errores"
        restaurants={[] as any}
        error="Fallo de red"
        statePolishV1
        onRetry={onRetry}
        onErrorFallback={onFallback}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('No pudimos actualizar esta sección')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await user.click(screen.getByRole('button', { name: 'Quitar filtros' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(emitHomeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'rail_error_retry_click',
        rail_id: 'error-rail'
      })
    );
    expect(emitHomeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'rail_empty_state_action_click',
        rail_id: 'error-rail',
        action: 'clear_filters'
      })
    );
  });
});
