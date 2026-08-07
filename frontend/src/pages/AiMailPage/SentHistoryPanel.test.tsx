import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import { SentHistoryPanel } from './SentHistoryPanel';

const { resolveMock, prepareMock, deliveriesState } = vi.hoisted(() => ({
  resolveMock: vi.fn(),
  prepareMock: vi.fn(),
  deliveriesState: {
    items: [] as Array<Record<string, unknown>>,
    isLoading: false,
    isError: false,
    error: null as Error | null,
  },
}));

vi.mock('@/features/ai-mail', () => ({
  useAiMailDeliveries: () => ({
    data: { items: deliveriesState.items, page: 1, limit: 10, total: deliveriesState.items.length },
    error: deliveriesState.error,
    isError: deliveriesState.isError,
    isLoading: deliveriesState.isLoading,
  }),
  useResolveAiMailDelivery: () => ({
    error: null,
    isPending: false,
    mutateAsync: resolveMock,
  }),
  usePrepareAiMailFollowUp: () => ({
    error: null,
    isPending: false,
    mutateAsync: prepareMock,
  }),
}));

function renderPanel(enabled = true) {
  const onOpenDraft = vi.fn();
  render(
    <ToastProvider>
      <MemoryRouter>
        <SentHistoryPanel enabled={enabled} onOpenDraft={onOpenDraft} />
      </MemoryRouter>
    </ToastProvider>,
  );
  return { onOpenDraft };
}

describe('SentHistoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deliveriesState.items = [];
    deliveriesState.isLoading = false;
    deliveriesState.isError = false;
    deliveriesState.error = null;
  });

  it('shows empty state when no deliveries exist', () => {
    renderPanel();
    expect(screen.getByText(/No emails sent yet/i)).toBeInTheDocument();
  });

  it('lists deliveries with status text and opens detail', () => {
    deliveriesState.items = [
      {
        deliveryId: 'del-1',
        draftId: 'draft-1',
        draftVersion: 2,
        status: 'failed',
        provider: 'google',
        recipientEmail: 'recruiter@example.com',
        fromEmail: 'me@gmail.com',
        subject: 'Hello',
        companyName: 'Acme',
        roleTitle: 'Engineer',
        resumeId: 'resume-1',
        connectedAccountId: 1,
        connectedAccountEmail: 'me@gmail.com',
        connectedAccountDisconnected: false,
        normalizedErrorCode: 'GMAIL_SEND_FAILED',
        attemptedAt: '2026-08-01T00:00:00.000Z',
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ];
    renderPanel();

    expect(screen.getByText('Acme — Engineer')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(screen.getByText('Delivery detail')).toBeInTheDocument();
    expect(screen.getByText(/GMAIL_SEND_FAILED/)).toBeInTheDocument();
  });

  it('resolves unknown deliveries from the detail drawer', async () => {
    const unknown = {
      deliveryId: 'del-unknown',
      draftId: 'draft-1',
      draftVersion: 1,
      status: 'unknown',
      provider: 'google',
      recipientEmail: 'recruiter@example.com',
      fromEmail: 'me@gmail.com',
      subject: 'Ping',
      companyName: 'Acme',
      roleTitle: 'Engineer',
      resumeId: 'resume-1',
      connectedAccountId: 1,
      connectedAccountEmail: 'me@gmail.com',
      connectedAccountDisconnected: false,
      attemptedAt: '2026-08-01T00:00:00.000Z',
      createdAt: '2026-08-01T00:00:00.000Z',
    };
    deliveriesState.items = [unknown];
    resolveMock.mockResolvedValue({
      ...unknown,
      userResolution: 'confirmed_sent',
      userResolvedAt: '2026-08-07T00:00:00.000Z',
    });

    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    fireEvent.click(screen.getByRole('button', { name: /I checked — it was sent/i }));

    await waitFor(() =>
      expect(resolveMock).toHaveBeenCalledWith({
        deliveryId: 'del-unknown',
        resolution: 'confirmed_sent',
      }),
    );
  });

  it('prepares a follow-up draft and opens it', async () => {
    deliveriesState.items = [
      {
        deliveryId: 'del-sent',
        draftId: 'draft-1',
        draftVersion: 2,
        status: 'sent',
        provider: 'google',
        recipientEmail: 'recruiter@example.com',
        fromEmail: 'me@gmail.com',
        subject: 'Hello',
        companyName: 'Acme',
        roleTitle: 'Engineer',
        resumeId: 'resume-1',
        connectedAccountId: 1,
        connectedAccountEmail: 'me@gmail.com',
        connectedAccountDisconnected: false,
        sentAt: '2026-08-01T00:00:00.000Z',
        attemptedAt: '2026-08-01T00:00:00.000Z',
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ];
    prepareMock.mockResolvedValue({
      draft: { id: 'follow-up-draft' },
      warnings: ['You emailed this recruiter recently.'],
      suggestedFollowUpWindow: '5–7 business days after initial outreach',
    });

    const { onOpenDraft } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Prepare Follow-up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate Follow-up' }));

    await waitFor(() =>
      expect(prepareMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryId: 'del-sent',
          payload: expect.objectContaining({ style: 'concise' }),
        }),
      ),
    );
    expect(onOpenDraft).toHaveBeenCalledWith('follow-up-draft');
  });
});
