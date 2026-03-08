import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import PWAInstallPrompt from './PWAInstallPrompt';

type MockBeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function buildBeforeInstallPromptEvent(overrides?: Partial<MockBeforeInstallPromptEvent>) {
  return Object.assign(new Event('beforeinstallprompt'), {
    preventDefault: vi.fn(),
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
    ...overrides,
  }) as MockBeforeInstallPromptEvent;
}

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window.navigator, 'standalone', {
      configurable: true,
      value: false,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: '(display-mode: standalone)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  });

  it('renders after beforeinstallprompt and forwards the native install prompt', async () => {
    render(<PWAInstallPrompt />);

    const installEvent = buildBeforeInstallPromptEvent();
    await act(async () => {
      window.dispatchEvent(installEvent);
    });

    expect(await screen.findByText('Guarda FastEat en tu pantalla principal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Instalar app' }));

    await waitFor(() => {
      expect(installEvent.prompt).toHaveBeenCalledTimes(1);
    });
  });

  it('persists dismissal and hides the prompt', async () => {
    render(<PWAInstallPrompt />);

    const installEvent = buildBeforeInstallPromptEvent();
    await act(async () => {
      window.dispatchEvent(installEvent);
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Después' }));

    expect(window.localStorage.getItem('fast-eat:pwa-install-dismissed')).toBeTruthy();
    expect(screen.queryByText('Guarda FastEat en tu pantalla principal')).not.toBeInTheDocument();
  });
});