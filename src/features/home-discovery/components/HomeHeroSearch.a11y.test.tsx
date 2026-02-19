import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import HomeHeroSearch from './HomeHeroSearch';

expect.extend(toHaveNoViolations);

describe('HomeHeroSearch accessibility', () => {
  it('has no basic accessibility violations', async () => {
    const { container } = render(
      <HomeHeroSearch
        hasActiveLocation
        searchQuery=""
        onSearchQueryChange={() => undefined}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has an explicit accessible label for search input', () => {
    render(
      <HomeHeroSearch
        hasActiveLocation
        searchQuery=""
        onSearchQueryChange={() => undefined}
      />
    );

    expect(screen.getByLabelText('Buscar restaurantes o comida')).toBeInTheDocument();
  });

  it('shows notifications option for users', () => {
    render(
      <HomeHeroSearch
        hasActiveLocation
        searchQuery=""
        onSearchQueryChange={() => undefined}
      />
    );

    expect(screen.getByRole('button', { name: /notificaciones/i })).toBeInTheDocument();
  });
});
