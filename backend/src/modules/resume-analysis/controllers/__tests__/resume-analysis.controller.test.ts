import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const methods: Record<string, ReturnType<typeof vi.fn>> = {};
  const names = [
    'startAnalysis',
    'getAnalysis',
    'updateStep',
    'getKeywords',
    'getSuggestions',
    'applySuggestion',
    'ignoreSuggestion',
    'updateContent',
    'recheckAts',
    'saveVersion',
    'getVersions',
    'listSavedVersions',
    'getSavedVersion',
    'deleteSavedVersion',
    'exportResume',
  ];
  for (const name of names) methods[name] = vi.fn();
  return { svc: methods };
});

vi.mock('@/modules/resume-analysis/services/resume-analysis.service.js', () => ({
  resumeAnalysisService: h.svc,
}));

vi.mock('@/shared/utils/response.js', () => ({
  successResponse: (message: string, data?: unknown) => ({ message, data }),
}));

import * as controller from '@/modules/resume-analysis/controllers/resume-analysis.controller.js';

const next = vi.fn();

const makeRes = () => {
  const res: Record<string, ReturnType<typeof vi.fn> & { self: unknown }> = {
    status: vi.fn(function () {
      return this;
    }),
    json: vi.fn(),
    set: vi.fn(),
    removeHeader: vi.fn(),
  };
  return res as unknown as {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    removeHeader: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  next.mockReset();
  Object.values(h.svc).forEach((fn) => fn.mockReset());
});

describe('resume-analysis.controller', () => {
  it('startAnalysis: returns 202 with the result', async () => {
    const res = makeRes();
    h.svc.startAnalysis.mockResolvedValue({ analysisId: 'a', status: 'ANALYZING' });
    await controller.startAnalysisController(
      {
        user: { principalId: 'u-1' },
        params: { resumeId: 'r-1' },
        body: { targetRole: 'T', experienceLevel: 'MID' },
      } as never,
      res as never,
      next,
    );
    expect(h.svc.startAnalysis).toHaveBeenCalledWith(
      { resumeId: 'r-1', targetRole: 'T', experienceLevel: 'MID', jobDescription: undefined },
      'u-1',
    );
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ message: 'Analysis started', data: expect.anything() });
  });

  it('getAnalysis: returns a 200 with analysis when present', async () => {
    const res = makeRes();
    h.svc.getAnalysis.mockResolvedValue({ atsScore: 70 });
    await controller.getAnalysisController(
      { user: { principalId: 'u-1' }, params: { resumeId: 'r-1' } } as never,
      res as never,
      next as never,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private',
    );
    expect(res.removeHeader).toHaveBeenCalledWith('ETag');
  });

  it('getAnalysis: returns null-200 when no analysis exists', async () => {
    const res = makeRes();
    h.svc.getAnalysis.mockResolvedValue(null);
    await controller.getAnalysisController(
      { user: { principalId: 'u-1' }, params: { resumeId: 'r-1' } } as never,
      res as never,
      next as never,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'No analysis yet', data: null }),
    );
  });

  it('updateStep: returns null-200 when there is no analysis', async () => {
    const res = makeRes();
    h.svc.updateStep.mockResolvedValue(null);
    await controller.updateStepController(
      { user: { principalId: 'u-1' }, params: { resumeId: 'r-1' }, body: { step: 3 } } as never,
      res as never,
      next as never,
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'No analysis yet' }));
  });

  it('applySuggestion: passes preserveContent through', async () => {
    const res = makeRes();
    h.svc.applySuggestion.mockResolvedValue({ status: 'APPLIED' });
    await controller.applySuggestionController(
      {
        user: { principalId: 'u-1' },
        params: { resumeId: 'r-1', suggestionId: '5' },
        body: { preserveContent: true },
      } as never,
      res as never,
      next as never,
    );
    expect(h.svc.applySuggestion).toHaveBeenCalledWith('r-1', 5, 'u-1', { preserveContent: true });
  });

  it('exportResume: uses the format query param', async () => {
    const res = makeRes();
    h.svc.exportResume.mockResolvedValue({ mimeType: 'text/plain' });
    await controller.exportResumeController(
      {
        user: { principalId: 'u-1' },
        params: { resumeId: 'r-1' },
        query: { format: 'pdf' },
      } as never,
      res as never,
      next as never,
    );
    expect(h.svc.exportResume).toHaveBeenCalledWith('r-1', 'pdf', 'u-1');
  });

  it('saveVersion: returns 201', async () => {
    const res = makeRes();
    h.svc.saveVersion.mockResolvedValue({ id: 1 });
    await controller.saveVersionController(
      {
        user: { principalId: 'u-1' },
        params: { resumeId: 'r-1' },
        body: { label: 'v1', content: 'c' },
      } as never,
      res as never,
      next as never,
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('forwards rejected service errors to next', async () => {
    const res = makeRes();
    const boom = new Error('nope');
    h.svc.getKeywords.mockRejectedValue(boom);
    await controller.getKeywordsController(
      { user: { principalId: 'u-1' }, params: { resumeId: 'r-1' } } as never,
      res as never,
      next as never,
    );
    expect(next).toHaveBeenCalledWith(boom);
  });

  it('covers the remaining happy-path handlers', async () => {
    h.svc.getSuggestions.mockResolvedValue([]);
    h.svc.ignoreSuggestion.mockResolvedValue({ status: 'IGNORED' });
    h.svc.updateContent.mockResolvedValue({});
    h.svc.recheckAts.mockResolvedValue({ atsScore: 90 });
    h.svc.getVersions.mockResolvedValue([]);
    h.svc.listSavedVersions.mockResolvedValue([]);
    h.svc.getSavedVersion.mockResolvedValue({ id: 1 });
    h.svc.deleteSavedVersion.mockResolvedValue({ id: 1 });

    const res = makeRes();
    const base = {
      user: { principalId: 'u-1' },
      params: { resumeId: 'r-1', suggestionId: '1', versionId: '1' },
    } as never;

    await controller.getSuggestionsController(base, res as never, next as never);
    await controller.ignoreSuggestionController(base, res as never, next as never);
    await controller.updateContentController(
      { ...base, body: { content: 'x' } } as never,
      res as never,
      next as never,
    );
    await controller.recheckAtsController(base, res as never, next as never);
    await controller.getVersionsController(base, res as never, next as never);
    await controller.listSavedVersionsController(
      { user: { principalId: 'u-1' } } as never,
      res as never,
      next as never,
    );
    await controller.getSavedVersionController(
      { ...base, params: { versionId: '7' } } as never,
      res as never,
      next as never,
    );
    await controller.deleteSavedVersionController(
      { ...base, params: { versionId: '7' } } as never,
      res as never,
      next as never,
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });
});
