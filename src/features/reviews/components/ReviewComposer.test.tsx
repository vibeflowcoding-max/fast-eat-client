import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewComposer from '@/features/reviews/components/ReviewComposer';

describe('ReviewComposer', () => {
  it('submits selected rating and comment', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<ReviewComposer onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /set rating 4/i }));
    await user.type(screen.getByRole('textbox'), 'Great service');
    await user.click(screen.getByRole('button', { name: /submit review/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      rating: 4,
      comment: 'Great service'
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
});
