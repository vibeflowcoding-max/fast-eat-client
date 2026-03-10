import { render, screen } from '@testing-library/react';
import { TextField } from '@/../resources/components';

describe('TextField required label', () => {
  it('does not render a fallback required badge when no localized label is provided', () => {
    render(<TextField label="Email" required />);

    expect(screen.queryByText('Required')).not.toBeInTheDocument();
  });

  it('renders the provided localized required badge label', () => {
    render(<TextField label="Correo" required requiredLabel="Obligatorio" />);

    expect(screen.getByText('Obligatorio')).toBeInTheDocument();
  });
});