import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CartItemRow from './CartItemRow';
import type { CartItem } from '../types';

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
});