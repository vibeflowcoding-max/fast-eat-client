import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomeDiscoveryWidget from './HomeDiscoveryWidget';

const closeChat = vi.fn();
const sendMessage = vi.fn();

vi.mock('../hooks/useHomeDiscoveryChat', () => ({
  useHomeDiscoveryChat: () => ({
    isOpen: true,
    openChat: vi.fn(),
    closeChat,
    loading: false,
    inputValue: '',
    setInputValue: vi.fn(),
    history: [{ role: 'assistant', content: 'Hola desde asistente' }],
    recommendations: [
      {
        id: 'rec-1',
        restaurantId: 'restaurant-1',
        title: 'Combo Sushi',
        subtitle: 'Buena relación precio/calidad'
      }
    ],
    followUps: ['¿Quieres comparar opciones?'],
    compareOptions: {
      title: 'Comparación',
      options: [
        {
          restaurantId: 'restaurant-1',
          label: 'Sushi Place',
          basePrice: 7000,
          deliveryFee: 1200,
          platformFee: 600,
          discount: 800,
          finalPrice: 8000
        }
      ]
    },
    traceId: 'trace-test',
    sendMessage
  })
}));

vi.mock('../analytics', () => ({
  emitHomeEvent: vi.fn()
}));

describe('HomeDiscoveryWidget integration', () => {
  it('renders recommendation cards from assistant response and forwards CTA actions', async () => {
    const user = userEvent.setup();
    const onRecommendationClick = vi.fn();
    const onCompareRequest = vi.fn();

    render(
      <HomeDiscoveryWidget
        enabled
        onRecommendationClick={onRecommendationClick}
      />
    );

    expect(screen.getByText('Combo Sushi')).toBeInTheDocument();
    expect(screen.getByText('Buena relación precio/calidad')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ver restaurante' }));
    expect(onRecommendationClick).toHaveBeenCalledWith('restaurant-1');

    await user.click(screen.getByRole('button', { name: 'Comparar' }));
    expect(onCompareRequest).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ restaurantId: 'restaurant-1' })])
    );
  });

  it('supports keyboard close on Escape for assistant dialog', async () => {
    const user = userEvent.setup();

    render(<HomeDiscoveryWidget enabled />);

    await user.keyboard('{Escape}');
    expect(closeChat).toHaveBeenCalled();
  });
});
