import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockResumeBuilderService } = vi.hoisted(() => ({
  mockResumeBuilderService: {
    listResumes: vi.fn(),
    uploadResume: vi.fn(),
    deleteResume: vi.fn(),
    startAnalysis: vi.fn(),
    getAnalysis: vi.fn(),
    getKeywords: vi.fn(),
    getSuggestions: vi.fn(),
    getVersions: vi.fn(),
    applySuggestion: vi.fn(),
    ignoreSuggestion: vi.fn(),
    updateContent: vi.fn(),
    recheckAts: vi.fn(),
    saveVersion: vi.fn(),
    updateStep: vi.fn(),
    exportResume: vi.fn(),
  },
}));

vi.mock('@/services/resumeBuilder.service', () => ({
  resumeBuilderService: mockResumeBuilderService,
}));

vi.mock('./exportResume', () => ({
  downloadResumePdf: vi.fn(),
  downloadResumeTxt: vi.fn(),
}));

vi.mock('@/components/organisms/Toast/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

import { ResumeBuilderPage } from './ResumeBuilderPage';

function renderPage(initialPath = '/resume-builder') {
  const router = createMemoryRouter(
    [
      { path: '/resume-builder', element: <ResumeBuilderPage /> },
      { path: '/resume-builder/:resumeId', element: <ResumeBuilderPage /> },
    ],
    { initialEntries: [initialPath] },
  );
  return render(<RouterProvider router={router} />);
}

describe('ResumeBuilderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResumeBuilderService.listResumes.mockResolvedValue([]);
    mockResumeBuilderService.getAnalysis.mockResolvedValue(null);
    mockResumeBuilderService.getVersions.mockResolvedValue([]);
    mockResumeBuilderService.getKeywords.mockResolvedValue({
      missing: [],
      matched: [],
      partial: [],
    });
    mockResumeBuilderService.getSuggestions.mockResolvedValue([]);
  });

  it('renders the upload step when no resume id is present', async () => {
    renderPage();

    expect(await screen.findByText(/what types of resume are supported/i)).toBeInTheDocument();
    expect(mockResumeBuilderService.listResumes).toHaveBeenCalled();
  });

  it('starts on the define-role step when a resume id is in the route', async () => {
    mockResumeBuilderService.getAnalysis.mockResolvedValue({
      id: 1,
      resumeId: 'resume-1',
      targetRole: 'Software Engineer',
      experienceLevel: 'mid',
      jobDescription: 'Build APIs',
      atsScore: 85,
      keywordMatch: 80,
      skillMatch: 90,
      contentQuality: 85,
      readability: 80,
      formattingScore: 90,
      strengths: [],
      weaknesses: [],
      editedContent: null,
      currentStep: 2,
      status: 'COMPLETED',
      keywords: [],
      suggestions: [],
    });

    renderPage('/resume-builder/resume-1');

    await waitFor(() => {
      expect(mockResumeBuilderService.getAnalysis).toHaveBeenCalledWith('resume-1');
    });

    expect(await screen.findByDisplayValue('Software Engineer')).toBeInTheDocument();
  });
});
