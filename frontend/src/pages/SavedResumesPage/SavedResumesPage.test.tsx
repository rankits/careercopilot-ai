import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SavedResumeVersion } from '@/services/resumeBuilder.service';

import { SavedResumesPage, fileBase, truncate } from './SavedResumesPage';

const { listSavedVersionsMock, parseResumeContentMock, downloadResumePdfMock } = vi.hoisted(() => ({
  listSavedVersionsMock: vi.fn(),
  parseResumeContentMock: vi.fn(),
  downloadResumePdfMock: vi.fn(),
}));

vi.mock('@/services/resumeBuilder.service', () => ({
  resumeBuilderService: {
    listSavedVersions: listSavedVersionsMock,
  },
}));

vi.mock('@/pages/ResumeBuilderPage/utils', () => ({
  parseResumeContent: parseResumeContentMock,
}));

vi.mock('@/pages/ResumeBuilderPage/exportResume', () => ({
  downloadResumePdf: downloadResumePdfMock,
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
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/resume-builder/saved" element={<SavedResumesPage />} />
        <Route path="/resume-builder" element={<p>Resume Builder</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('truncate', () => {
  it('returns placeholder for empty/missing JD', () => {
    expect(truncate(null)).toBe('No job description saved for this version.');
    expect(truncate(undefined)).toBe('No job description saved for this version.');
    expect(truncate('   ')).toBe('No job description saved for this version.');
  });

  it('collapses whitespace and truncates long text', () => {
    expect(truncate('  Build   APIs  ')).toBe('Build APIs');
    const long = 'a'.repeat(230);
    const result = truncate(long, 220);
    expect(result).toHaveLength(221);
    expect(result.endsWith('…')).toBe(true);
  });
});

describe('fileBase', () => {
  it('sanitizes role and builds filename stem', () => {
    expect(fileBase(version({ targetRole: 'Sr. Java/Backend!', id: 9 }))).toBe('Sr_JavaBackend_v9');
  });

  it('falls back when role is empty after sanitize', () => {
    expect(fileBase(version({ targetRole: '@@@', id: 3 }))).toBe('resume_v3');
    expect(fileBase(version({ targetRole: '', id: 4 }))).toBe('resume_v4');
  });
});

describe('SavedResumesPage', () => {
  beforeEach(() => {
    listSavedVersionsMock.mockReset();
    parseResumeContentMock.mockReset();
    downloadResumePdfMock.mockReset();
    parseResumeContentMock.mockReturnValue({ fullName: 'Ada', originalText: 'Resume body' });
    downloadResumePdfMock.mockResolvedValue(undefined);
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
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

  it('lists versions with role, filename, ATS colors, and JD truncation', async () => {
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
        jobDescription: `x${'y'.repeat(250)}`,
      }),
    ]);

    renderPage();

    expect(await screen.findByText('Senior Engineer')).toBeInTheDocument();
    expect(screen.getByText('Untitled role')).toBeInTheDocument();
    expect(screen.getByText('Intern')).toBeInTheDocument();
    expect(screen.getByText((_, node) => node?.textContent === 'ATS 90')).toBeInTheDocument();
    expect(screen.getByText((_, node) => node?.textContent === 'ATS 65')).toBeInTheDocument();
    expect(screen.getByText((_, node) => node?.textContent === 'ATS 40')).toBeInTheDocument();
    expect(screen.getByText('Short JD')).toBeInTheDocument();
    expect(screen.getByText(/No job description saved for this version/i)).toBeInTheDocument();
    expect(screen.getByText((content) => content.endsWith('…'))).toBeInTheDocument();
  });

  it('navigates via Build new resume', async () => {
    const user = userEvent.setup();
    listSavedVersionsMock.mockResolvedValueOnce([version()]);
    renderPage();
    await screen.findByText('Java Developer');

    await user.click(screen.getByRole('button', { name: /build new resume/i }));
    expect(screen.getByText('Resume Builder')).toBeInTheDocument();
  });

  it('downloads PDF for a version', async () => {
    const user = userEvent.setup();
    listSavedVersionsMock.mockResolvedValueOnce([version()]);
    renderPage();
    await screen.findByText('Java Developer');

    await user.click(screen.getByRole('button', { name: /download pdf/i }));

    await waitFor(() => {
      expect(parseResumeContentMock).toHaveBeenCalledWith('Resume body', 'Java Developer');
      expect(downloadResumePdfMock).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'Ada' }),
        'Java_Developer_v1.pdf',
        'original',
      );
    });
  });

  it('downloads TXT for a version', async () => {
    const user = userEvent.setup();
    listSavedVersionsMock.mockResolvedValueOnce([version()]);
    const click = vi.fn();
    let downloadName = '';
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
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
    await user.click(screen.getByRole('button', { name: /download txt/i }));

    await waitFor(() => {
      expect(click).toHaveBeenCalled();
      expect(downloadName).toBe('Java_Developer_v1.txt');
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    });
  });

  it('alerts when download fails', async () => {
    const user = userEvent.setup();
    listSavedVersionsMock.mockResolvedValueOnce([version()]);
    parseResumeContentMock.mockImplementation(() => {
      throw new Error('parse failed');
    });

    renderPage();
    await screen.findByText('Java Developer');
    await user.click(screen.getByRole('button', { name: /download pdf/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Download failed. Please try again.');
    });
  });

  it('downloads using empty role when targetRole is blank', async () => {
    const user = userEvent.setup();
    listSavedVersionsMock.mockResolvedValueOnce([
      version({ id: 8, targetRole: '', resumeFileName: 'file.pdf' }),
    ]);
    renderPage();
    await screen.findByText('Untitled role');

    await user.click(screen.getByRole('button', { name: /download pdf/i }));

    await waitFor(() => {
      expect(parseResumeContentMock).toHaveBeenCalledWith('Resume body', '');
      expect(downloadResumePdfMock).toHaveBeenCalledWith(
        expect.any(Object),
        'resume_v8.pdf',
        'original',
      );
    });
  });

  it('disables download buttons while a download is in flight', async () => {
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

    await user.click(screen.getByRole('button', { name: /download pdf/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '…' })).toBeDisabled();
      expect(screen.getByRole('button', { name: /download txt/i })).toBeDisabled();
    });

    await act(async () => {
      resolvePdf();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /download pdf/i })).toBeEnabled();
    });
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
