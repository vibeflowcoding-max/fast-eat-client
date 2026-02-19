import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IntentChipsBar from './IntentChipsBar';

describe('IntentChipsBar keyboard navigation', () => {
  it('allows toggling chips with keyboard and updates aria-pressed state', async () => {
    const user = userEvent.setup();
    const onIntentChange = vi.fn();

    render(
      <IntentChipsBar
        intents={[
          { id: 'cheap', label: 'Barato ahora' },
          { id: 'fast', label: 'Entrega rápida' }
        ]}
        activeIntent={null}
        onIntentChange={onIntentChange}
      />
    );

    await user.tab();
    await user.tab();
    const firstChip = screen.getByRole('button', { name: 'Barato ahora' });
    expect(firstChip).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onIntentChange).toHaveBeenCalledWith('cheap');
  });

  it('supports reset behavior when active chip is selected again', async () => {
    const user = userEvent.setup();
    const onIntentChange = vi.fn();

    render(
      <IntentChipsBar
        intents={[{ id: 'cheap', label: 'Barato ahora' }]}
        activeIntent={'cheap'}
        onIntentChange={onIntentChange}
      />
    );

    const chip = screen.getByRole('button', { name: 'Barato ahora' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');

    chip.focus();
    await user.keyboard(' ');
    expect(onIntentChange).toHaveBeenCalledWith(null);
  });

  it('renders left and right scroll controls for section chips', () => {
    render(
      <IntentChipsBar
        intents={[
          { id: 'promotions', label: 'Promos' },
          { id: 'fast', label: 'Cercanos' },
          { id: 'best_rated', label: 'Mejor calidad' }
        ]}
        activeIntent={null}
        onIntentChange={() => undefined}
      />
    );

    expect(screen.getByRole('button', { name: 'Desplazar secciones a la izquierda' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desplazar secciones a la derecha' })).toBeInTheDocument();
  });

  it('renders Todos option and resets to null intent', async () => {
    const user = userEvent.setup();
    const onIntentChange = vi.fn();

    render(
      <IntentChipsBar
        intents={[{ id: 'promotions', label: 'Promos' }]}
        activeIntent={'promotions'}
        onIntentChange={onIntentChange}
        showAllOption
      />
    );

    const allButton = screen.getByRole('button', { name: 'Todos' });
    expect(allButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(allButton);
    expect(onIntentChange).toHaveBeenCalledWith(null);
  });
});
