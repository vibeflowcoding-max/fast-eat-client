import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewCard from '@/features/reviews/components/ReviewCard';

describe('ReviewCard', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('renders the submitted review summary when a review already exists', () => {
    render(
      <ReviewCard
        canReview
        existingReview={{ rating: 4, comment: 'Muy bueno' }}
        onSubmit={vi.fn()}
        subtitle="Solo para pedidos completados"
        title="Califica tu experiencia"
      />,
    );

    expect(screen.getByTestId('review-summary-inline')).toBeInTheDocument();
    expect(screen.getByText('★★★★☆')).toBeInTheDocument();
    expect(screen.getByText('Muy bueno')).toBeInTheDocument();
  });

  it('dismisses the composer and persists that state for the session', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <ReviewCard
        canReview
        dismissKey="order-1"
        existingReview={null}
        onSubmit={vi.fn()}
        subtitle="Solo para pedidos completados"
        title="Califica tu experiencia"
      />,
    );

    await user.click(screen.getByRole('button', { name: /not now/i }));

    expect(screen.queryByTestId('review-composer')).not.toBeInTheDocument();

    rerender(
      <ReviewCard
        canReview
        dismissKey="order-1"
        existingReview={null}
        onSubmit={vi.fn()}
        subtitle="Solo para pedidos completados"
        title="Califica tu experiencia"
      />,
    );

    expect(screen.queryByTestId('review-composer')).not.toBeInTheDocument();
  });
});