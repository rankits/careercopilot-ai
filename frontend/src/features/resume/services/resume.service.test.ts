import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resumeService } from './resume.service';

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('@/services/httpClient', () => ({
  httpClient: { get: getMock, post: postMock },
}));

const file = new File(['resume'], 'resume.pdf', { type: 'application/pdf' });

describe('resumeService', () => {
  beforeEach(() => {
    postMock.mockReset();
    getMock.mockReset();
  });

  it('uploads the resume as multipart data and returns parsed data when processing completes', async () => {
    const onMetadata = vi.fn();
    postMock.mockResolvedValueOnce({ data: { data: { id: 'resume-1', status: 'UPLOADED' } } });
    getMock
      .mockResolvedValueOnce({ data: { data: { id: 'resume-1', status: 'PROCESSED' } } })
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
    expect(getMock).toHaveBeenNthCalledWith(1, '/resumes/resume-1/status');
    expect(getMock).toHaveBeenNthCalledWith(2, '/resumes/resume-1/parsed-data');
  });

  it('surfaces parser failures and network timeouts consistently', async () => {
    postMock.mockRejectedValueOnce({ code: 'ECONNABORTED' });
    await expect(resumeService.parse(file)).rejects.toThrow('Resume upload timed out.');

    postMock.mockResolvedValueOnce({ data: { data: { id: 'resume-1', status: 'UPLOADED' } } });
    getMock.mockResolvedValueOnce({
      data: { data: { failureReason: 'Unreadable document', status: 'FAILED' } },
    });
    await expect(resumeService.parse(file)).rejects.toThrow('Unreadable document');
  });

  it('rejects unexpected upload and parsed response structures', async () => {
    postMock.mockResolvedValueOnce({ data: { data: {} } });
    await expect(resumeService.parse(file)).rejects.toThrow('invalid upload response');

    postMock.mockResolvedValueOnce({ data: { data: { id: 'resume-1', status: 'UPLOADED' } } });
    getMock
      .mockResolvedValueOnce({ data: { data: { status: 'PROCESSED' } } })
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
});
