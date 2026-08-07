import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AssistedApplicationsHowItWorksDialog } from './AssistedApplicationsHowItWorksDialog';

describe('AssistedApplicationsHowItWorksDialog', () => {
  it('shows the assisted apply steps and closes on Got it', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<AssistedApplicationsHowItWorksDialog onClose={onClose} open />);

    expect(screen.getByRole('dialog', { name: /how assisted apply works/i })).toBeInTheDocument();
    expect(screen.getByText(/mark as applied/i)).toBeInTheDocument();
    expect(
      screen.getByText(/career copilot does not fill or submit the form for you/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /got it/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
