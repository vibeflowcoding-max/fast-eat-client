import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ChatWidget from './ChatWidget';

vi.mock('../store', () => ({
  useCartStore: () => ({
    items: [],
    branchId: 'branch-1',
    fromNumber: '50688888888',
    isTestMode: false,
  }),
}));

vi.mock('../services/api', () => ({
  sendChatToN8N: vi.fn(),
}));

vi.mock('./ChatMessageList', () => ({
  default: () => <div>chat-message-list</div>,
}));

vi.mock('./ChatInput', () => ({
  default: () => <div>chat-input</div>,
}));

describe('ChatWidget', () => {
  it('allows dismissing the chef notification bubble without opening chat', async () => {
    const user = userEvent.setup();

    render(
      <ChatWidget
        menuItems={[]}
        notification={{ content: 'Listo. Agregué 1 Gallo Pinto a tu pedido.' }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Listo. Agregué 1 Gallo Pinto a tu pedido.')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Cerrar notificación del Chef' }));

    expect(screen.queryByText('Listo. Agregué 1 Gallo Pinto a tu pedido.')).not.toBeInTheDocument();
    expect(screen.queryByText('chat-message-list')).not.toBeInTheDocument();
  });
});