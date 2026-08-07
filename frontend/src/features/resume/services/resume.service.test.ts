import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resumeService } from './resume.service';

const { getMock, postMock, patchMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
}));

vi.mock('@/services/httpClient', () => ({
  httpClient: { get: getMock, patch: patchMock, post: postMock },
}));

const file = new File(['resume'], 'resume.pdf', { type: 'application/pdf' });

describe('resumeService', () => {
  beforeEach(() => {
    postMock.mockReset();
    getMock.mockReset();
    patchMock.mockReset();
  });

  it('uploads the resume as multipart data and returns parsed data when processing completes', async () => {
    const onMetadata = vi.fn();
    postMock.mockResolvedValueOnce({ data: { data: { id: 'resume-1', status: 'UPLOADED' } } });
    getMock
      .mockResolvedValueOnce({
        data: {
          data: {
            currentStep: 'COMPLETED',
            progress: 100,
            resumeStatus: 'PROCESSED',
            status: 'COMPLETED',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            confidenceScore: 0.82,
            extractedData: { personalInformation: { fullName: 'Ada' } },
          },
        },
      });

    await expect(resumeService.parse(file, { onMetadata })).resolves.toEqual({
      personalInformation: { fullName: 'Ada' },
    });
    expect(onMetadata).toHaveBeenCalledWith({
      confidenceScore: 0.82,
      extractedData: { personalInformation: { fullName: 'Ada' } },
    });

    const payload: unknown = postMock.mock.calls[0]?.[1];
    expect(payload).toBeInstanceOf(FormData);
    expect((payload as FormData).get('resume')).toBe(file);
    expect(postMock).toHaveBeenCalledWith('/resumes/upload', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    expect(getMock).toHaveBeenNthCalledWith(1, '/resumes/resume-1/parse-status');
    expect(getMock).toHaveBeenNthCalledWith(2, '/resumes/resume-1/parsed-data');
  });

  it('surfaces parser failures and network timeouts consistently', async () => {
    postMock.mockRejectedValueOnce({ code: 'ECONNABORTED' });
    await expect(resumeService.parse(file)).rejects.toThrow('Resume upload timed out.');

    postMock.mockResolvedValueOnce({ data: { data: { id: 'resume-1', status: 'UPLOADED' } } });
    getMock.mockResolvedValueOnce({
      data: {
        data: {
          failureReason: 'Unreadable document',
          resumeStatus: 'FAILED',
          status: 'FAILED',
          currentStep: 'FAILED',
          progress: 100,
        },
      },
    });
    await expect(resumeService.parse(file)).rejects.toThrow('Unreadable document');
  });

  it('rejects unexpected upload and parsed response structures', async () => {
    postMock.mockResolvedValueOnce({ data: { data: {} } });
    await expect(resumeService.parse(file)).rejects.toThrow('invalid upload response');

    postMock.mockResolvedValueOnce({ data: { data: { id: 'resume-1', status: 'UPLOADED' } } });
    getMock
      .mockResolvedValueOnce({
        data: {
          data: {
            currentStep: 'COMPLETED',
            progress: 100,
            resumeStatus: 'PROCESSED',
            status: 'COMPLETED',
          },
        },
      })
      .mockResolvedValueOnce({ data: { data: { extractedData: null } } });
    await expect(resumeService.parse(file)).rejects.toThrow('empty response');
  });

  it('reports profile completion status and treats missing profiles as incomplete', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: {
          confirmedAt: '2026-07-31T00:00:00.000Z',
          isComplete: true,
          sourceResumeId: 'resume-1',
          userId: 'user-1',
        },
      },
    });

    await expect(resumeService.getProfileStatus('user-1')).resolves.toEqual({
      confirmedAt: '2026-07-31T00:00:00.000Z',
      isComplete: true,
      sourceResumeId: 'resume-1',
      userId: 'user-1',
    });
    expect(getMock).toHaveBeenCalledWith('/resumes/profiles/user-1');

    const missingProfileError = Object.assign(new Error('Not found'), {
      isAxiosError: true,
      response: { status: 404 },
    });
    getMock.mockRejectedValueOnce(missingProfileError);

    await expect(resumeService.getProfileStatus('user-2')).resolves.toEqual({
      confirmedAt: null,
      isComplete: false,
      sourceResumeId: null,
      userId: 'user-2',
    });
  });

  it('rejects an invalid profile status response', async () => {
    getMock.mockResolvedValueOnce({ data: { data: { confirmedAt: null } } });
    await expect(resumeService.getProfileStatus('user-1')).rejects.toThrow(
      'Profile status returned an invalid response.',
    );
  });

  it('confirms a profile and falls back to a default message', async () => {
    postMock.mockResolvedValueOnce({ data: { message: 'Profile confirmed' } });
    await expect(
      resumeService.confirmProfile({ resumeId: 'resume-1', userId: 'user-1' }),
    ).resolves.toEqual({ message: 'Profile confirmed' });
    expect(postMock).toHaveBeenCalledWith('/resumes/profile/user-1', { resumeId: 'resume-1' });

    postMock.mockResolvedValueOnce({ data: {} });
    await expect(
      resumeService.confirmProfile({ resumeId: 'resume-1', userId: 'user-1' }),
    ).resolves.toEqual({ message: 'Profile created successfully' });
  });

  it('confirms a profile and normalizes service failures', async () => {
    postMock.mockRejectedValueOnce(
      Object.assign(new Error('boom'), { isAxiosError: true, response: { status: 500, data: {} } }),
    );
    await expect(
      resumeService.confirmProfile({ resumeId: 'resume-1', userId: 'user-1' }),
    ).rejects.toThrow('The resume service is temporarily unavailable. Please try again.');
  });

  it('loads the current profile or returns null on a missing profile', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: {
          certifications: [],
          education: [],
          experience: [],
          isComplete: true,
          personalDetails: { fullName: 'Ada' },
          skills: ['React'],
          sourceResumeId: 'resume-1',
          userId: 'user-1',
        },
      },
    });
    await expect(resumeService.getMyProfile()).resolves.toMatchObject({
      isComplete: true,
      userId: 'user-1',
    });

    getMock.mockRejectedValueOnce(
      Object.assign(new Error('Not found'), { isAxiosError: true, response: { status: 404 } }),
    );
    await expect(resumeService.getMyProfile()).resolves.toBeNull();
  });

  it('updates the current profile', async () => {
    patchMock.mockResolvedValueOnce({
      data: {
        message: 'Updated',
        data: {
          certifications: [],
          education: [],
          experience: [],
          isComplete: true,
          personalDetails: {},
          skills: [],
          sourceResumeId: null,
          userId: 'user-1',
        },
      },
    });
    await expect(resumeService.updateProfile({ skills: ['React'] })).resolves.toMatchObject({
      message: 'Updated',
      profile: { userId: 'user-1' },
    });
    expect(patchMock).toHaveBeenCalledWith('/resumes/profile/me', { skills: ['React'] });
  });

  it('rejects an invalid update response', async () => {
    patchMock.mockResolvedValueOnce({ data: {} });
    await expect(resumeService.updateProfile({})).rejects.toThrow(
      'Profile update returned an invalid response.',
    );
  });

  it('reports upload progress and completion through callbacks', async () => {
    const onUploaded = vi.fn();
    const onParsing = vi.fn();
    const onUploadProgress = vi.fn();

    postMock.mockImplementationOnce(
      (
        _url: string,
        _body: FormData,
        config?: { onUploadProgress?: (e: { loaded: number; total: number }) => void },
      ) => {
        config?.onUploadProgress?.({ loaded: 50, total: 100 });
        return Promise.resolve({ data: { data: { id: 'resume-1', status: 'UPLOADED' } } });
      },
    );
    getMock
      .mockResolvedValueOnce({
        data: {
          data: {
            currentStep: 'COMPLETED',
            progress: 100,
            resumeStatus: 'PROCESSED',
            status: 'COMPLETED',
          },
        },
      })
      .mockResolvedValueOnce({
        data: { data: { confidenceScore: null, extractedData: { fullName: 'Ada' } } },
      });

    await resumeService.parse(file, { onUploaded, onParsing, onUploadProgress });

    expect(onUploadProgress).toHaveBeenCalledWith(50);
    expect(onUploadProgress).toHaveBeenCalledWith(100);
    expect(onUploaded).toHaveBeenCalledWith('resume-1');
    expect(onParsing).toHaveBeenCalled();
  });

  it('follows the parse-status endpoint for processing uploads', async () => {
    postMock.mockResolvedValueOnce({ data: { data: { id: 'resume-1', status: 'UPLOADED' } } });
    getMock
      .mockResolvedValueOnce({
        data: {
          data: {
            currentStep: 'EXTRACTING_TEXT',
            progress: 20,
            resumeStatus: 'PROCESSING',
            status: 'EXTRACTING_TEXT',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            currentStep: 'NEEDS_REVIEW',
            progress: 80,
            resumeStatus: 'PROCESSED',
            status: 'NEEDS_REVIEW',
            warnings: ['x'],
          },
        },
      })
      .mockResolvedValueOnce({
        data: { data: { confidenceScore: 0.5, extractedData: { fullName: 'Ada' } } },
      });

    await expect(resumeService.parse(file)).resolves.toEqual({ fullName: 'Ada' });
    expect(getMock).toHaveBeenNthCalledWith(1, '/resumes/resume-1/parse-status');
    expect(getMock).toHaveBeenNthCalledWith(2, '/resumes/resume-1/parse-status');
  });
});
