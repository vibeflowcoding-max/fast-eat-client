import { fireEvent, render, screen } from '@testing-library/react';
import UserOnboardingModal from './UserOnboardingModal';

const storeState = {
  customerName: '',
  fromNumber: '',
  setCustomerName: vi.fn(),
  setFromNumber: vi.fn(),
  setUserLocation: vi.fn(),
  setOnboarded: vi.fn(),
};

vi.mock('@/store', () => ({
  useCartStore: () => storeState,
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const dictionaries: Record<string, Record<string, string>> = {
      userOnboardingModal: {
        title: '¡Bienvenido! 👋',
        subtitle: 'Completa tus datos para ordenar más rápido',
        nameLabel: 'Nombre completo',
        phoneLabel: 'WhatsApp',
        namePlaceholder: 'Ej: Juan Pérez',
        phonePlaceholder: 'Ej: 88881234',
        continue: 'Continuar',
        skip: 'Omitir por ahora',
        'errors.nameRequired': 'Por favor ingresa tu nombre',
        'errors.phoneRequired': 'Por favor ingresa tu WhatsApp',
        'errors.phoneInvalid': 'Formato de número inválido',
      },
    };

    return dictionaries[namespace]?.[key] ?? key;
  },
}));

describe('UserOnboardingModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeState.customerName = '';
    storeState.fromNumber = '';
  });

  it('renders translated onboarding copy', () => {
    render(<UserOnboardingModal isOpen onComplete={vi.fn()} />);

    expect(screen.getByText('¡Bienvenido! 👋')).toBeInTheDocument();
    expect(screen.getByText('Completa tus datos para ordenar más rápido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();
  });

  it('shows translated validation errors when submitting empty fields', () => {
    render(<UserOnboardingModal isOpen onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.getByText('Por favor ingresa tu nombre')).toBeInTheDocument();
    expect(screen.getByText('Por favor ingresa tu WhatsApp')).toBeInTheDocument();
  });
});