import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CartItemRow from './CartItemRow';
import type { CartItem } from '../types';

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, values?: Record<string, string>) => {
    if (namespace !== 'cartItemRow') {
      return key;
    }

    switch (key) {
      case 'unitPrice':
        return `₡${values?.price} c/u`;
      case 'decrementQuantity':
        return `Reducir cantidad de ${values?.itemName}`;
      case 'incrementQuantity':
        return `Aumentar cantidad de ${values?.itemName}`;
      case 'removeItem':
        return `Quitar ${values?.itemName}`;
      case 'comboLabel':
        return 'Combo';
      case 'comboIncludes':
        return `Incluye: ${values?.items}`;
      default:
        return key;
    }
  },
}));

const item: CartItem = {
  id: 'ramen-1',
  name: 'Tonkotsu Ramen',
  description: 'Caldo cremoso con cerdo braseado.',
  price: 4500,
  category: 'Ramen',
  image: '',
  quantity: 2,
  notes: '',
};

describe('CartItemRow', () => {
  it('renders localized labels for the row actions', () => {
    const onSyncCartAction = vi.fn();

    render(<CartItemRow isSyncing={false} item={item} onSyncCartAction={onSyncCartAction} />);

    expect(screen.getByText('₡4,500 c/u')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reducir cantidad de Tonkotsu Ramen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aumentar cantidad de Tonkotsu Ramen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar Tonkotsu Ramen' })).toBeInTheDocument();
  });

  it('routes quantity actions through the cart sync callback', async () => {
    const onSyncCartAction = vi.fn();

    render(<CartItemRow isSyncing={false} item={item} onSyncCartAction={onSyncCartAction} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reducir cantidad de Tonkotsu Ramen' }));
    await userEvent.click(screen.getByRole('button', { name: 'Aumentar cantidad de Tonkotsu Ramen' }));

    expect(onSyncCartAction).toHaveBeenNthCalledWith(1, item, 'increment', 1);
    expect(onSyncCartAction).toHaveBeenNthCalledWith(2, item, 'increment', 3);
  });

  it('removes the row through the cart sync callback', async () => {
    const onSyncCartAction = vi.fn();

    render(<CartItemRow isSyncing={false} item={item} onSyncCartAction={onSyncCartAction} />);

    await userEvent.click(screen.getByRole('button', { name: 'Quitar Tonkotsu Ramen' }));

    expect(onSyncCartAction).toHaveBeenCalledWith(item, 'remove', 0);
  });

  it('shows combo metadata when the row represents a combo line', () => {
    const onSyncCartAction = vi.fn();
    const comboItem: CartItem = {
      ...item,
      id: 'combo:lunch-set',
      sourceType: 'combo',
      comboItems: [
        { itemId: 'item-1', name: 'California Roll', quantity: 1 },
        { itemId: 'item-2', name: 'Té frío', quantity: 1 },
      ],
    };

    render(<CartItemRow isSyncing={false} item={comboItem} onSyncCartAction={onSyncCartAction} />);

    expect(screen.getByText('Combo')).toBeInTheDocument();
    expect(screen.getByText('Incluye: California Roll, Té frío')).toBeInTheDocument();
  });
});