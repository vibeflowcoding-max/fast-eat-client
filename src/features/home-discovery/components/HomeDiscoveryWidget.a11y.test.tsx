import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import HomeDiscoveryWidget from './HomeDiscoveryWidget';

expect.extend(toHaveNoViolations);

const closeChat = vi.fn();

vi.mock('../hooks/useHomeDiscoveryChat', () => ({
  useHomeDiscoveryChat: () => ({
    isOpen: true,
    openChat: vi.fn(),
    closeChat,
    loading: false,
    inputValue: '',
    setInputValue: vi.fn(),
    history: [{ role: 'assistant', content: 'Hola desde asistente' }],
    recommendations: [],
    followUps: ['¿Quieres comparar opciones?'],
    compareOptions: undefined,
    traceId: 'trace-a11y',
    sendMessage: vi.fn()
  })
}));

vi.mock('../analytics', () => ({
  emitHomeEvent: vi.fn()
}));

describe('HomeDiscoveryWidget accessibility', () => {
  it('has no basic accessibility violations for open assistant dialog', async () => {
    const { container } = render(<HomeDiscoveryWidget enabled />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('supports keyboard close with Escape', async () => {
    const user = userEvent.setup();
    render(<HomeDiscoveryWidget enabled />);

    await user.keyboard('{Escape}');
    expect(closeChat).toHaveBeenCalled();
  });

  it('exposes accessible input label for assistant message input', () => {
    render(<HomeDiscoveryWidget enabled />);
    expect(screen.getByLabelText('Mensaje para asistente de descubrimiento')).toBeInTheDocument();
  });
});
