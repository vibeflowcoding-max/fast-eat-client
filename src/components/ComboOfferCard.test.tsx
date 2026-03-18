import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComboOfferCard from './ComboOfferCard';
import type { OfferCombo } from '@/types';

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, values?: Record<string, string | number>) => {
    if (namespace !== 'comboOfferCard') {
      return key;
    }

    switch (key) {
      case 'badge':
        return 'Combo';
      case 'inCart':
        return `${values?.count} en el carrito`;
      case 'fallbackDescription':
        return 'Selección lista para pedir con precio especial.';
      case 'comboPrice':
        return 'Precio combo';
      case 'saveAmount':
        return `Ahorras ₡${values?.amount}`;
      case 'includes':
        return 'Incluye';
      case 'basePrice':
        return 'Precio original';
      case 'adding':
        return 'Agregando...';
      case 'addAnother':
        return 'Agregar otro';
      case 'addCombo':
        return 'Agregar combo';
      default:
        return key;
    }
  },
}));

const combo: OfferCombo = {
  id: 'combo-1',
  branchId: 'branch-1',
  title: 'Lunch Set',
  description: 'Sushi + bebida',
  image: null,
  active: true,
  availableFrom: null,
  availableTo: null,
  basePrice: 6200,
  comboPrice: 4900,
  savingsAmount: 1300,
  items: [
    { itemId: 'item-1', name: 'California Roll', quantity: 1, description: null, image: null },
    { itemId: 'item-2', name: 'Té frío', quantity: 1, description: null, image: null },
  ],
};

describe('ComboOfferCard', () => {
  it('renders combo pricing and included items', () => {
    render(<ComboOfferCard combo={combo} currentQuantity={0} onAddCombo={vi.fn()} />);

    expect(screen.getByText('Lunch Set')).toBeInTheDocument();
    expect(screen.getByText('Precio combo')).toBeInTheDocument();
    expect(screen.getByText('Ahorras ₡1,300')).toBeInTheDocument();
    expect(screen.getByText('California Roll')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar combo' })).toBeInTheDocument();
  });

  it('increments from the existing quantity when adding again', async () => {
    const onAddCombo = vi.fn().mockResolvedValue(true);

    render(<ComboOfferCard combo={combo} currentQuantity={2} onAddCombo={onAddCombo} />);

    await userEvent.click(screen.getByRole('button', { name: 'Agregar otro' }));

    expect(onAddCombo).toHaveBeenCalledWith(combo, 3);
  });
});