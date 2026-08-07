import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import type { AiMailDraft } from '@/features/ai-mail/types/aiMail.types';

import { AiMailPage } from './AiMailPage';

const {
  archiveMock,
  createMock,
  generateMock,
  markReadyMock,
  refetchMock,
  regenerateMock,
  restoreRevisionMock,
  updateMock,
  state,
  draft,
  resumes,
  profile,
  readiness,
  revisions,
} = vi.hoisted(() => {
  const errorState: { updateError: unknown } = { updateError: null };
  const readinessState = {
    ready: false,
    blockers: [
      {
        code: 'AI_MAIL_JOB_DESCRIPTION_MISSING',
        message: 'A job description is required.',
        field: 'jobDescription',
      },
    ],
    warnings: [
      {
        code: 'AI_MAIL_NO_ACHIEVEMENTS',
        message: 'Profile has no verified achievements.',
      },
    ],
    profile: {
      exists: true,
      confirmed: true,
      candidateName: 'Ada Lovelace',
      currentTitle: 'Engineer',
      topSkills: ['TypeScript'],
      fullNamePresent: true,
      currentRolePresent: true,
      locationPresent: true,
      skillCount: 1,
      experienceCount: 1,
      educationCount: 1,
      certificationCount: 0,
      achievementCount: 0,
      professionalLinkCount: 0,
      completenessPercent: 83,
      missingRecommendedSections: ['achievements'],
    },
    detectedJobMetadata: {},
    suggestedJobMetadata: {
      roleTitle: 'Backend Engineer',
      companyName: 'Detected Co',
    },
    counts: {
      profileSkills: 2,
      resumeSkills: 3,
      experienceEntries: 1,
      jobRequirements: 0,
      jobResponsibilities: 0,
      jobKeywords: 0,
    },
  };
  const resume = {
    id: '11111111-1111-4111-8111-111111111111',
    fileName: 'ada.pdf',
    label: 'Ada Lovelace',
    uploadedAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-06T00:00:00.000Z',
    processingStatus: 'PROCESSED',
    parseStatus: 'COMPLETED',
    availability: 'eligible' as const,
    eligibleForAiMail: true,
    isPrimary: true,
  };
  const draftState: AiMailDraft = {
    id: 'draft-1',
    userId: 'user-1',
    recruiterEmail: 'recruiter@example.com',
    recruiterName: 'Sam',
    companyName: 'Acme',
    roleTitle: 'Engineer',
    jobDescription: 'Build useful products',
    resumeId: resume.id,
    constraints: {
      tone: 'professional',
      maximumWords: 250,
      includeCallToAction: true,
      includeResumeMention: true,
      emphasizeSkills: [],
      emphasizeAchievements: [],
      avoidTopics: ['salary expectations'],
    },
    subject: '',
    bodyText: '',
    status: 'input',
    version: 1,
    userEdited: false,
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
  };
  return {
    archiveMock: vi.fn(),
    createMock: vi.fn(),
    generateMock: vi.fn(),
    markReadyMock: vi.fn(),
    refetchMock: vi.fn(),
    regenerateMock: vi.fn(),
    restoreRevisionMock: vi.fn(),
    updateMock: vi.fn(),
    state: errorState,
    readiness: readinessState,
    draft: draftState,
    resumes: {
      items: [
        resume,
        {
          id: '22222222-2222-4222-8222-222222222222',
          fileName: 'processing.pdf',
          label: 'Processing resume',
          uploadedAt: '2026-08-02T00:00:00.000Z',
          updatedAt: '2026-08-02T00:00:00.000Z',
          processingStatus: 'PROCESSING',
          availability: 'processing' as const,
          eligibleForAiMail: false,
          ineligibleReason: 'Resume is still processing.',
          isPrimary: false,
        },
      ],
      primaryResumeId: resume.id,
    },
    profile: {
      exists: true,
      confirmed: true,
      candidateName: 'Ada Lovelace',
      currentTitle: 'Engineer',
      yearsOfExperience: 5,
      topSkills: ['TypeScript', 'React'],
      fullNamePresent: true,
      currentRolePresent: true,
      locationPresent: true,
      skillCount: 2,
      experienceCount: 1,
      educationCount: 1,
      certificationCount: 0,
      achievementCount: 0,
      professionalLinkCount: 1,
      completenessPercent: 83,
      missingRecommendedSections: ['achievements'],
    },
    revisions: [
      {
        id: 'revision-1',
        draftId: 'draft-1',
        draftVersion: 1,
        revisionNumber: 1,
        source: 'ai_generated' as const,
        subject: 'Earlier subject',
        bodyText: 'Earlier body',
        createdAt: '2026-08-07T01:00:00.000Z',
      },
    ],
  };
});

vi.mock('@/features/ai-mail', () => ({
  DEFAULT_AI_MAIL_JD_LIMIT: 20_000,
  DEFAULT_MAIL_GENERATION_CONSTRAINTS: draft.constraints,
  isAiMailVersionConflict: (error: unknown) =>
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'AI_MAIL_DRAFT_VERSION_CONFLICT',
  useAiMailConfig: () => ({
    data: {
      enabled: true,
      saveDraftsEnabled: true,
      partialRewriteEnabled: false,
      provider: 'fake',
      limits: {
        maxJobDescriptionCharacters: 20_000,
        maxAdditionalContextCharacters: 3_000,
      },
      phase2: { gmailIntegrationEnabled: false, mailSendingEnabled: false },
    },
    isError: false,
    isLoading: false,
  }),
  useAiMailResumes: () => ({
    data: resumes,
    error: null,
    isError: false,
    isLoading: false,
  }),
  useAiMailProfileSummary: () => ({
    data: profile,
    error: null,
    isError: false,
    isLoading: false,
  }),
  useAiMailGenerationReadiness: (draftId: string | null) => ({
    data: draftId ? readiness : undefined,
    error: null,
    isError: false,
    isLoading: false,
  }),
  useAiMailDrafts: () => ({
    data: { items: [draft], page: 1, limit: 20, total: 1 },
    isError: false,
    isLoading: false,
  }),
  useAiMailDraft: (draftId: string | null) => ({
    data: draftId ? draft : undefined,
    error: null,
    isError: false,
    isLoading: false,
    refetch: refetchMock,
  }),
  useAiMailDraftRevisions: (draftId: string | null) => ({
    data: draftId ? revisions : undefined,
    error: null,
    isError: false,
    isLoading: false,
  }),
  useCreateAiMailDraft: () => ({ error: null, isPending: false, mutateAsync: createMock }),
  useUpdateAiMailDraft: () => ({
    error: state.updateError,
    isPending: false,
    mutateAsync: updateMock,
  }),
  useArchiveAiMailDraft: () => ({ error: null, isPending: false, mutateAsync: archiveMock }),
  useMarkAiMailDraftReady: () => ({
    error: null,
    isPending: false,
    mutateAsync: markReadyMock,
  }),
  useGenerateAiMailDraft: () => ({
    error: null,
    isPending: false,
    mutateAsync: generateMock,
  }),
  useRegenerateAiMailDraft: () => ({
    error: null,
    isPending: false,
    mutateAsync: regenerateMock,
  }),
  useRewriteAiMailDraft: () => ({
    error: null,
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useGenerateAiMailSubject: () => ({
    error: null,
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useRestoreAiMailDraftRevision: () => ({
    error: null,
    isPending: false,
    mutateAsync: restoreRevisionMock,
  }),
  useSendAiMailDraft: () => ({
    error: null,
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useAiMailSendPreview: () => ({
    data: undefined,
    error: null,
    isError: false,
    isLoading: false,
  }),
  useAiMailDraftDeliveries: () => ({
    data: [],
    error: null,
    isError: false,
    isLoading: false,
  }),
  useAiMailSendLimits: () => ({
    data: { hourly: { used: 0, limit: 10 }, daily: { used: 0, limit: 30 } },
    error: null,
    isError: false,
    isLoading: false,
  }),
  useAiMailDeliveries: () => ({
    data: { items: [], page: 1, limit: 10, total: 0 },
    error: null,
    isError: false,
    isLoading: false,
  }),
  useResolveAiMailDelivery: () => ({
    error: null,
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  usePrepareAiMailFollowUp: () => ({
    error: null,
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

vi.mock('@/services/connected-accounts.service', () => ({
  connectedAccountsService: {
    getAccounts: vi.fn(async () => []),
  },
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: (options: { enabled?: boolean }) => ({
      data: options.enabled === false ? undefined : [],
      error: null,
      isError: false,
      isLoading: false,
    }),
  };
});

function renderPage(initialEntry = '/ai-mail') {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AiMailPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('AiMailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.updateError = null;
    readiness.ready = false;
    readiness.blockers = [
      {
        code: 'AI_MAIL_JOB_DESCRIPTION_MISSING',
        message: 'A job description is required.',
        field: 'jobDescription',
      },
    ];
    draft.subject = '';
    draft.bodyText = '';
    draft.userEdited = false;
    draft.status = 'input';
    draft.version = 1;
    createMock.mockResolvedValue({ ...draft, id: 'draft-created' });
    updateMock.mockResolvedValue({ ...draft, version: 2 });
    markReadyMock.mockResolvedValue({ ...draft, status: 'ready_to_send', version: 3 });
    generateMock.mockImplementation(async () => {
      const result = {
        draft: {
          ...draft,
          subject: 'Generated subject',
          bodyText: 'Generated body text',
          status: 'generated' as const,
          version: 2,
          userEdited: false,
          generatedBy: {
            provider: 'fake',
            model: 'fake-model',
            generatedAt: '2026-08-07T02:00:00.000Z',
          },
        },
        output: {
          subject: 'Generated subject',
          bodyText: 'Generated body text',
          detectedContext: {},
          highlightedQualifications: [],
          warnings: [{ code: 'UNSUPPORTED_CLAIM', message: 'Verify the highlighted claim.' }],
        },
        attemptId: 'attempt-1',
        idempotentReplay: false,
      };
      Object.assign(draft, result.draft);
      return result;
    });
    regenerateMock.mockResolvedValue({
      draft: { ...draft, subject: 'Regenerated', bodyText: 'Regenerated body', version: 3 },
      output: {
        subject: 'Regenerated',
        bodyText: 'Regenerated body',
        detectedContext: {},
        highlightedQualifications: [],
        warnings: [],
      },
      attemptId: 'attempt-2',
      idempotentReplay: false,
    });
    restoreRevisionMock.mockResolvedValue({ ...draft, version: 2 });
  });

  it('keeps the draft UI and exact safety boundary', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'AI Mail Composer' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Job Details' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Email Draft' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Selected Resume' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Candidate Profile' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Generation Readiness' })).toBeInTheDocument();
    expect(screen.getByText('Draft only — no email has been sent.')).toBeInTheDocument();
  });

  it('auto-selects the primary resume for a new draft', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Selected Resume' })).toBeInTheDocument();
    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('ada.pdf')).toBeInTheDocument();
  });

  it('shows candidate profile summary and missing sections', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Candidate Profile' })).toBeInTheDocument();
    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0);
    expect(screen.getByText(/Engineer · 5 yrs/)).toBeInTheDocument();
    expect(screen.getByText('Missing: achievements')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Complete Profile' })).toHaveAttribute(
      'href',
      '/profile/edit',
    );
  });

  it('shows JD character counter and readiness blockers/warnings', () => {
    renderPage('/ai-mail?draftId=draft-1');
    expect(screen.getByText(/\/ 20,000 characters/)).toBeInTheDocument();
    expect(screen.getByText('Not ready to generate')).toBeInTheDocument();
    expect(screen.getByText('A job description is required.')).toBeInTheDocument();
    expect(screen.getByText('Profile has no verified achievements.')).toBeInTheDocument();
  });

  it('explains ineligible resumes in the picker', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Change Resume' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.mouseDown(within(dialog).getByLabelText('Resume'));
    expect(await screen.findByText(/Resume is still processing/)).toBeInTheDocument();
  });

  it('does not expose send actions', () => {
    renderPage();
    expect(screen.queryByRole('button', { name: /^send email$/i })).not.toBeInTheDocument();
  });

  it('keeps Generate Email disabled when readiness is not ready', () => {
    renderPage('/ai-mail?draftId=draft-1');
    expect(screen.getByRole('button', { name: 'Generate Email' })).toBeDisabled();
    expect(
      screen.getByText('Complete the generation readiness checklist first.'),
    ).toBeInTheDocument();
  });

  it('enables Generate Email when readiness is ready and a draft is selected', () => {
    readiness.ready = true;
    readiness.blockers = [];
    renderPage('/ai-mail?draftId=draft-1');
    expect(screen.getByRole('button', { name: 'Generate Email' })).toBeEnabled();
  });

  it('shows generating state and populates the editor on success', async () => {
    readiness.ready = true;
    readiness.blockers = [];
    renderPage('/ai-mail?draftId=draft-1');

    fireEvent.click(screen.getByRole('button', { name: 'Generate Email' }));

    await waitFor(() =>
      expect(generateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 1,
          idempotencyKey: expect.any(String),
        }),
      ),
    );

    expect(await screen.findByDisplayValue('Generated subject')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Generated body text')).toBeInTheDocument();
    expect(screen.getByText('Verify the highlighted claim.')).toBeInTheDocument();
    expect(screen.getByText('AI-generated')).toBeInTheDocument();
  });

  it('asks for confirmation before regenerating when the draft has user edits', async () => {
    readiness.ready = true;
    readiness.blockers = [];
    draft.subject = 'Existing subject';
    draft.bodyText = 'Existing body';
    draft.userEdited = true;
    draft.status = 'edited';
    renderPage('/ai-mail?draftId=draft-1');

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate Email' }));

    const dialog = await screen.findByRole('dialog', { name: 'Overwrite your edits?' });
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Save & Regenerate' })).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Discard Edits & Regenerate' }),
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Discard Edits & Regenerate' }));

    await waitFor(() =>
      expect(regenerateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 1,
          confirmOverwriteUserEdits: true,
          idempotencyKey: expect.any(String),
        }),
      ),
    );
  });

  it('creates a draft using the selected resume', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/Recruiter email/), {
      target: { value: 'recruiter@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Job description/), {
      target: { value: 'A useful role' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Draft' }));

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          recruiterEmail: 'recruiter@example.com',
          jobDescription: 'A useful role',
          resumeId: '11111111-1111-4111-8111-111111111111',
        }),
      ),
    );
  });

  it('saves an opened draft with its current version', async () => {
    renderPage('/ai-mail?draftId=draft-1');

    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Hello', version: 1 }),
      ),
    );
  });

  it('gates mark-ready until subject and body exist, then uses the saved version', async () => {
    renderPage('/ai-mail?draftId=draft-1');

    const readyButton = screen.getByRole('button', { name: 'Mark Ready' });
    expect(readyButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Hello' } });
    fireEvent.change(screen.getByLabelText('Email body'), {
      target: { value: 'I would like to connect.' },
    });
    expect(readyButton).toBeEnabled();
    fireEvent.click(readyButton);

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ version: 1 }));
    await waitFor(() => expect(markReadyMock).toHaveBeenCalledWith({ version: 2 }));
  });

  it('shows version-conflict feedback with a reload action', async () => {
    const conflict = Object.assign(new Error('This draft changed elsewhere.'), {
      code: 'AI_MAIL_DRAFT_VERSION_CONFLICT',
    });
    state.updateError = conflict;
    updateMock.mockRejectedValue(conflict);
    renderPage('/ai-mail?draftId=draft-1');

    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));

    expect(await screen.findAllByText('This draft changed elsewhere.')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(refetchMock).toHaveBeenCalled();
  });

  it('switches to the Sent tab and shows history empty state', () => {
    renderPage('/ai-mail?tab=sent');
    expect(screen.getByRole('tab', { name: 'Sent' })).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByText(/No emails sent yet|Enable mail sending to view delivery history/i),
    ).toBeInTheDocument();
  });
});
