import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/organisms/Toast/ToastProvider';

import type { SavedResumeVersion } from '@/services/resumeBuilder.service';

import { SavedResumesPage } from './SavedResumesPage';

const {
  listSavedVersionsMock,
  exportResumeMock,
  deleteSavedVersionMock,
  parseResumeContentMock,
  downloadResumePdfMock,
} = vi.hoisted(() => ({
  listSavedVersionsMock: vi.fn(),
  exportResumeMock: vi.fn(),
  deleteSavedVersionMock: vi.fn(),
  parseResumeContentMock: vi.fn(),
  downloadResumePdfMock: vi.fn(),
}));

vi.mock('@/services/resumeBuilder.service', () => ({
  resumeBuilderService: {
    listSavedVersions: listSavedVersionsMock,
    exportResume: exportResumeMock,
    deleteSavedVersion: deleteSavedVersionMock,
  },
}));

vi.mock('@/pages/ResumeBuilderPage/utils', () => ({
  parseResumeContent: parseResumeContentMock,
}));

vi.mock('@/pages/ResumeBuilderPage/exportResume', () => ({
  downloadResumePdf: downloadResumePdfMock,
}));

vi.mock('@/pages/ResumeBuilderPage/components/OptimizeStep/ResumeTemplatePreview', () => ({
  ResumeTemplatePreview: ({ targetRole }: { targetRole: string }) => (
    <div data-testid="resume-template-preview">{targetRole || 'preview'}</div>
  ),
}));

const version = (overrides: Partial<SavedResumeVersion> = {}): SavedResumeVersion => ({
  id: 1,
  label: 'v1',
  content: 'Resume body',
  atsScore: 85,
  createdAt: '2026-08-01T10:00:00.000Z',
  targetRole: 'Java Developer',
  jobDescription: 'Build APIs with Spring Boot',
  resumeFileName: 'resume.pdf',
  resumeId: 'resume-1',
  ...overrides,
});

function renderPage(initialPath = '/resume-builder/saved') {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/resume-builder/saved" element={<SavedResumesPage />} />
          <Route path="/resume-builder" element={<p>Resume Builder</p>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('SavedResumesPage', () => {
  beforeEach(() => {
    listSavedVersionsMock.mockReset();
    exportResumeMock.mockReset();
    deleteSavedVersionMock.mockReset();
    parseResumeContentMock.mockReset();
    downloadResumePdfMock.mockReset();
    parseResumeContentMock.mockReturnValue({ fullName: 'Ada', originalText: 'Resume body' });
    downloadResumePdfMock.mockResolvedValue(undefined);
    deleteSavedVersionMock.mockResolvedValue({ id: 1 });
    exportResumeMock.mockResolvedValue({
      content: 'ZG9jeA==',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileName: 'resume.docx',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading then empty state and navigates to builder', async () => {
    const user = userEvent.setup();
    let resolveList!: (value: SavedResumeVersion[]) => void;
    listSavedVersionsMock.mockImplementation(
      () =>
        new Promise<SavedResumeVersion[]>((resolve) => {
          resolveList = resolve;
        }),
    );

    renderPage();
    expect(screen.getByText(/loading saved resumes/i)).toBeInTheDocument();

    await act(async () => {
      resolveList([]);
    });
    expect(await screen.findByText(/no saved resumes yet/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /open resume builder/i }));
    expect(screen.getByText('Resume Builder')).toBeInTheDocument();
  });

  it('shows load error', async () => {
    listSavedVersionsMock.mockRejectedValueOnce(new Error('network'));
    renderPage();
    expect(await screen.findByText(/could not load saved resumes/i)).toBeInTheDocument();
  });

  it('lists versions with role, scores, JD one-line, and no filter button', async () => {
    listSavedVersionsMock.mockResolvedValueOnce([
      version({ id: 1, targetRole: 'Senior Engineer', atsScore: 90, jobDescription: 'Short JD' }),
      version({
        id: 2,
        atsScore: 65,
        targetRole: '',
        resumeFileName: '',
        jobDescription: null,
      }),
      version({
        id: 3,
        targetRole: 'Intern',
        atsScore: 40,
        jobDescription: `Long JD ${'y'.repeat(80)}`,
      }),
    ]);

    renderPage();

    expect(await screen.findByText('Senior Engineer')).toBeInTheDocument();
    expect(screen.getByText('Untitled role')).toBeInTheDocument();
    expect(screen.getByText('Intern')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
    expect(screen.getByText('65')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('Poor')).toBeInTheDocument();
    expect(screen.getByText('Short JD')).toBeInTheDocument();
    expect(screen.getByText(/No job description saved for this version/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /read more/i })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /^filter$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sort by:/i })).toBeInTheDocument();
  });

  it('opens sort menu and changes sort', async () => {
    const user = userEvent.setup();
    listSavedVersionsMock.mockResolvedValueOnce([
      version({ id: 1, atsScore: 70, createdAt: '2026-08-01T10:00:00.000Z' }),
      version({
        id: 2,
        targetRole: 'High Score',
        atsScore: 95,
        createdAt: '2026-07-01T10:00:00.000Z',
      }),
    ]);

    renderPage();
    await screen.findByText('Java Developer');

    await user.click(screen.getByRole('button', { name: /sort by:/i }));
    await user.click(await screen.findByRole('menuitem', { name: /ATS Score/i }));

    expect(screen.getByRole('button', { name: /sort by: ATS Score/i })).toBeInTheDocument();
  });

  it('opens full JD on Read more', async () => {
    const user = userEvent.setup();
    listSavedVersionsMock.mockResolvedValueOnce([
      version({ jobDescription: 'Build APIs with Spring Boot and Kafka' }),
    ]);
    renderPage();
    await screen.findByText('Java Developer');

    await user.click(screen.getByRole('button', { name: /read more/i }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Build APIs with Spring Boot and Kafka')).toBeInTheDocument();
  });

  it('paginates nine cards per page', async () => {
    const user = userEvent.setup();
    listSavedVersionsMock.mockResolvedValueOnce(
      Array.from({ length: 10 }, (_, index) =>
        version({
          id: index + 1,
          targetRole: `Role ${index + 1}`,
          createdAt: `2026-08-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`,
        }),
      ),
    );

    renderPage();
    expect(await screen.findByText('Role 10')).toBeInTheDocument();
    expect(screen.getByText('Role 2')).toBeInTheDocument();
    expect(screen.queryByText('Role 1')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '2' }));
    expect(await screen.findByText('Role 1')).toBeInTheDocument();
    expect(screen.queryByText('Role 10')).not.toBeInTheDocument();
  });

  it('navigates via Build new resume', async () => {
    const user = userEvent.setup();
    listSavedVersionsMock.mockResolvedValueOnce([version()]);
    renderPage();
    await screen.findByText('Java Developer');

    await user.click(screen.getByRole('button', { name: /build new resume/i }));
    expect(screen.getByText('Resume Builder')).toBeInTheDocument();
  });

  it('shows formatted preview with saved content', async () => {
    const user = userEvent.setup();
    listSavedVersionsMock.mockResolvedValueOnce([version()]);
    renderPage();
    await screen.findByText('Java Developer');

    await user.click(screen.getByRole('button', { name: /^preview$/i }));
    expect(await screen.findByTestId('resume-template-preview')).toHaveTextContent(
      'Java Developer',
    );
    expect(parseResumeContentMock).toHaveBeenCalledWith('Resume body', 'Java Developer');
  });

  it('downloads PDF for a version', async () => {
    const user = userEvent.setup();
    listSavedVersionsMock.mockResolvedValueOnce([version()]);
    renderPage();
    await screen.findByText('Java Developer');

    await user.click(screen.getByRole('button', { name: /^PDF$/i }));

    await waitFor(() => {
      expect(parseResumeContentMock).toHaveBeenCalledWith('Resume body', 'Java Developer');
      expect(downloadResumePdfMock).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'Ada' }),
        'Java_Developer_v1.pdf',
        'classic',
      );
    });
  });

  it('downloads DOCX for a version', async () => {
    const user = userEvent.setup();
    listSavedVersionsMock.mockResolvedValueOnce([version()]);
    const click = vi.fn();
    let downloadName = '';
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return {
          click,
          set href(_v: string) {},
          get href() {
            return '';
          },
          set download(v: string) {
            downloadName = v;
          },
          get download() {
            return downloadName;
          },
        } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tag);
    });

    renderPage();
    await screen.findByText('Java Developer');
    await user.click(screen.getByRole('button', { name: /^DOCX$/i }));

    await waitFor(() => {
      expect(exportResumeMock).toHaveBeenCalledWith('resume-1', 'docx');
      expect(click).toHaveBeenCalled();
      expect(downloadName).toBe('resume.docx');
    });
  });

  it('shows an error toast when download fails', async () => {
    const user = userEvent.setup();
    listSavedVersionsMock.mockResolvedValueOnce([version()]);
    parseResumeContentMock.mockImplementation(() => {
      throw new Error('parse failed');
    });

    renderPage();
    await screen.findByText('Java Developer');
    await user.click(screen.getByRole('button', { name: /^PDF$/i }));

    expect(await screen.findByText('Download failed. Please try again.')).toBeInTheDocument();
  });

  it('downloads using empty role when targetRole is blank', async () => {
    const user = userEvent.setup();
    listSavedVersionsMock.mockResolvedValueOnce([
      version({ id: 8, targetRole: '', resumeFileName: 'file.pdf' }),
    ]);
    renderPage();
    await screen.findByText('Untitled role');

    await user.click(screen.getByRole('button', { name: /^PDF$/i }));

    await waitFor(() => {
      expect(parseResumeContentMock).toHaveBeenCalledWith('Resume body', '');
      expect(downloadResumePdfMock).toHaveBeenCalledWith(
        expect.any(Object),
        'resume_v8.pdf',
        'classic',
      );
    });
  });

  it('only disables the in-flight download chip', async () => {
    const user = userEvent.setup();
    listSavedVersionsMock.mockResolvedValueOnce([version()]);
    let resolvePdf!: () => void;
    downloadResumePdfMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvePdf = resolve;
        }),
    );

    renderPage();
    await screen.findByText('Java Developer');

    await user.click(screen.getByRole('button', { name: /^PDF$/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '…' })).toBeDisabled();
      expect(screen.getByRole('button', { name: /^DOCX$/i })).toBeEnabled();
    });

    await act(async () => {
      resolvePdf();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^PDF$/i })).toBeEnabled();
    });
  });

  it('opens card menu and deletes a resume', async () => {
    const user = userEvent.setup();
    listSavedVersionsMock.mockResolvedValueOnce([version()]);
    renderPage();
    await screen.findByText('Java Developer');

    await user.click(screen.getByRole('button', { name: /more options/i }));
    await user.click(await screen.findByRole('menuitem', { name: /delete resume/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/delete resume\?/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(deleteSavedVersionMock).toHaveBeenCalledWith(1);
    });
    expect(screen.queryByText('Java Developer')).not.toBeInTheDocument();
  });

  it('ignores late list results after unmount', async () => {
    let resolveList!: (value: SavedResumeVersion[]) => void;
    listSavedVersionsMock.mockImplementation(
      () =>
        new Promise<SavedResumeVersion[]>((resolve) => {
          resolveList = resolve;
        }),
    );

    const { unmount } = renderPage();
    expect(screen.getByText(/loading saved resumes/i)).toBeInTheDocument();
    unmount();

    await act(async () => {
      resolveList([version()]);
    });
  });

  it('ignores late list errors after unmount', async () => {
    let rejectList!: (reason?: unknown) => void;
    listSavedVersionsMock.mockImplementation(
      () =>
        new Promise<SavedResumeVersion[]>((_, reject) => {
          rejectList = reject;
        }),
    );

    const { unmount } = renderPage();
    unmount();

    await act(async () => {
      rejectList(new Error('late fail'));
    });
  });
});
