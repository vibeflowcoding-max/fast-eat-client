import { fireEvent, render, screen } from '@testing-library/react';
import ItemDetailModal from './ItemDetailModal';
import type { MenuItem, SelectedModifier } from '@/types';

vi.mock('@/features/home-discovery/hooks/useDietaryGuardian', () => ({
  useDietaryGuardian: () => ({
    isActive: false,
    checkItem: vi.fn(),
    loadingMap: {},
    resultsMap: {},
  }),
}));

const baseItem: MenuItem = {
  id: 'item-1',
  name: 'Ramen Especial',
  description: 'Caldo intenso con toppings premium',
  image: 'https://example.com/ramen.jpg',
  price: 4500,
  category: 'Ramen',
  ingredients: [],
  variants: [
    { id: 'v1', name: 'Regular', price: 4500, isDefault: true },
    { id: 'v2', name: 'Grande', price: 5200, isDefault: false },
  ],
  modifierGroups: [
    {
      id: 'g1',
      name: 'Extras',
      required: false,
      minSelection: 0,
      maxSelection: 2,
      options: [
        { id: 'm1', name: 'Huevo', priceDelta: 500, available: true, stockCount: null },
      ],
    },
  ],
  hasStructuredCustomization: true,
};

describe('ItemDetailModal', () => {
  it('renders the shared close button and confirm CTA', () => {
    render(
      <ItemDetailModal
        errorMessage={null}
        isSyncing={false}
        item={baseItem}
        modalScrollRef={{ current: null }}
        notes=""
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onScroll={vi.fn()}
        quantity={1}
        selectedModifiers={[]}
        selectedVariantId="v1"
        setNotes={vi.fn()}
        setQuantity={vi.fn()}
        setSelectedModifiers={vi.fn()}
        setSelectedVariantId={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Añadir por ₡4,500/i })).toBeInTheDocument();
  });

  it('routes quantity, variant, and modifier actions through the provided handlers', () => {
    const setQuantity = vi.fn();
    const setSelectedVariantId = vi.fn();
    const setSelectedModifiers = vi.fn();

    render(
      <ItemDetailModal
        errorMessage={null}
        isSyncing={false}
        item={baseItem}
        modalScrollRef={{ current: null }}
        notes=""
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onScroll={vi.fn()}
        quantity={1}
        selectedModifiers={[]}
        selectedVariantId="v1"
        setNotes={vi.fn()}
        setQuantity={setQuantity}
        setSelectedModifiers={setSelectedModifiers}
        setSelectedVariantId={setSelectedVariantId}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Aumentar cantidad de Ramen Especial' }));
    fireEvent.click(screen.getByRole('button', { name: /Grande/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Huevo Selección múltiple +₡500' }));

    expect(setQuantity).toHaveBeenCalledWith(2);
    expect(setSelectedVariantId).toHaveBeenCalledWith('v2');
    expect(setSelectedModifiers).toHaveBeenCalledWith([
      {
        modifierItemId: 'm1',
        name: 'Huevo',
        priceDelta: 500,
        quantity: 1,
        groupId: 'g1',
        groupName: 'Extras',
      } satisfies SelectedModifier,
    ]);
  });
});