import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MenuItemCard from './MenuItemCard';

const mockCheckItem = vi.fn();

vi.mock('../features/home-discovery/hooks/useDietaryGuardian', () => ({
  useDietaryGuardian: () => ({
    isActive: false,
    checkItem: mockCheckItem,
    loadingMap: {},
    resultsMap: {},
  }),
}));

describe('MenuItemCard', () => {
  const item = {
    id: 'roll-1',
    name: 'Roll California',
    description: 'Cangrejo, aguacate y pepino.',
    image: '',
    price: 4500,
    category: 'Sushi',
  };

  beforeEach(() => {
    mockCheckItem.mockReset();
  });

  it('adds one unit directly from the compact card CTA', async () => {
    const onAddToCart = vi.fn().mockResolvedValue(true);

    render(
      <MenuItemCard
        item={item}
        onAddToCart={onAddToCart}
        currentQuantity={0}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Añadir Roll California' }));

    await waitFor(() => {
      expect(onAddToCart).toHaveBeenCalledWith({
        ...item,
        quantity: 1,
        notes: '',
      });
    });
  });

  it('opens the inline editor for items already in the cart and confirms the updated quantity', async () => {
    const onAddToCart = vi.fn().mockResolvedValue(true);

    render(
      <MenuItemCard
        item={item}
        onAddToCart={onAddToCart}
        currentQuantity={2}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Editar Roll California' }));

    expect(screen.getByRole('button', { name: 'Aumentar cantidad de Roll California' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Aumentar cantidad de Roll California' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => {
      expect(onAddToCart).toHaveBeenCalledWith({
        ...item,
        quantity: 3,
        notes: '',
      });
    });
  });
});