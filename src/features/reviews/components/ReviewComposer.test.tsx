import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach } from 'vitest';
import ReviewComposer from '@/features/reviews/components/ReviewComposer';

beforeEach(() => {
  vi.useRealTimers();
});

describe('ReviewComposer', () => {
  it('submits selected rating and comment', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<ReviewComposer onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /set rating 4/i }));
    await user.type(screen.getByRole('textbox'), 'Great service');
    await user.click(screen.getByRole('button', { name: /submit review/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        rating: 4,
        comment: 'Great service'
      });
    });
  });

  it('keeps submit disabled when review is ineligible', () => {
    render(
      <ReviewComposer
        disabled
        disabledReason="order_not_completed"
        onSubmit={vi.fn()}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit review/i });
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/order_not_completed/i)).toBeInTheDocument();
  });

  it('renders a dismiss action when provided', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(<ReviewComposer onDismiss={onDismiss} onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /not now/i }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows submission errors and keeps the form available for retry', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('submit_failed'));

    render(<ReviewComposer onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /set rating 5/i }));
    await user.type(screen.getByRole('textbox'), 'Excellent');
    await user.click(screen.getByRole('button', { name: /submit review/i }));

    expect(await screen.findByText(/submit_failed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit review/i })).toBeEnabled();
  });
});
