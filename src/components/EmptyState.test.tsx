import { render, screen } from '@testing-library/react';

import { EmptyState } from '@/../resources/components';

describe('EmptyState', () => {
  it('does not render a default action button when no action is provided', () => {
    render(<EmptyState title="No favorites" description="Nothing here yet." />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a button when actionLabel is provided explicitly', () => {
    render(<EmptyState title="No favorites" actionLabel="Browse restaurants" />);

    expect(screen.getByRole('button', { name: 'Browse restaurants' })).toBeInTheDocument();
  });
});