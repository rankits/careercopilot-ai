import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const prisma = {
    resume: { findUnique: vi.fn(), findFirst: vi.fn() },
    resumeExtraction: { findFirst: vi.fn() },
    resumeAnalysis: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    resumeKeyword: {
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    resumeSuggestion: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    resumeVersion: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  };
  return {
    prisma,
    aiAnalyze: vi.fn(),
    aiValidate: vi.fn(),
    scoreEdited: vi.fn(),
    // Controllable return value for buildJdCoverageExtras (ensureFallbackSuggestions maps it).
    jdCoverageExtras: { current: [] as Array<Record<string, unknown>> },
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(() => h.logger),
    },
  };
});

vi.mock('@/shared/config/db.conf.js', () => ({ prisma: h.prisma, default: h.prisma }));
vi.mock('@/shared/logger/logger.js', () => ({ logger: h.logger, createChildLogger: vi.fn() }));
vi.mock('@/modules/resume-analysis/ai/resume-analysis-ai.client.js', () => ({
  resumeAnalysisAiClient: { analyze: h.aiAnalyze, validateTargetRoleAndJd: h.aiValidate },
}));
vi.mock('@/modules/resume-analysis/utils/ats-score.js', () => ({
  scoreEditedResume: h.scoreEdited,
}));
vi.mock('@/modules/resume-analysis/utils/merge-resume-content.js', () => ({
  // Return the raw resume text so downstream consumers (which call .match on it) get a string.
  buildWorkingResumeContent: vi.fn(({ resumeText }: { resumeText: string }) => resumeText),
}));
vi.mock('@/modules/resume-analysis/utils/suggestion-coverage.js', () => ({
  buildJdCoverageExtras: vi.fn(() => h.jdCoverageExtras.current),
}));

import { resumeAnalysisService as service } from '@/modules/resume-analysis/services/resume-analysis.service.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const analysis = (overrides: Record<string, unknown> = {}) => ({
  id: 'a-1',
  resumeId: 'r-1',
  targetRole: 'Engineer',
  experienceLevel: 'MID',
  jobDescription: 'Looking for React engineers',
  status: 'COMPLETED',
  atsScore: 70,
  keywordMatch: 50,
  skillMatch: 40,
  contentQuality: 60,
  readability: 55,
  formattingScore: 45,
  strengths: [],
  weaknesses: [],
  analysisDetails: null,
  editedContent: 'Edited resume content with React',
  currentStep: 2,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  resume: { originalName: 'resume.pdf' },
  keywords: [],
  suggestions: [],
  ...overrides,
});

const AI_RESULT = {
  atsScore: 72,
  keywordMatch: 70,
  skillMatch: 60,
  contentQuality: 75,
  readability: 80,
  formattingScore: 85,
  strengths: ['Good structure'],
  weaknesses: ['Some gaps'],
  missingKeywords: [{ term: 'react', importance: 'high' as const, reason: 'not mentioned' }],
  matchedKeywords: [{ term: 'node', importance: 'medium' as const }],
  skillAnalysis: {
    matchedSkills: ['react'],
    missingSkills: ['docker'],
    transferableSkills: [],
    additionalSkills: [],
    recommendedSkills: ['k8s'],
  },
  sectionScores: {
    summary: 80,
    experience: 70,
    skills: 90,
    education: 60,
    projects: 50,
    achievements: 40,
  },
  atsIssues: [],
  suggestions: [
    {
      title: 'Add skills',
      category: 'skills',
      originalText: '',
      suggestedText: 'React',
      impact: 'HIGH' as const,
      reason: '',
    },
  ],
  optimizedSections: {
    professionalSummary: '',
    skills: ['react'],
    experienceBullets: [],
    projectBullets: [],
  },
  optimizedResumeText: '',
};

const INPUT = {
  resumeId: 'r-1',
  targetRole: 'Engineer',
  experienceLevel: 'MID',
  jobDescription: 'Looking for React engineers',
};

const scoreReturn = (atsScore: number) => ({
  atsScore,
  keywordMatch: 70,
  skillMatch: 65,
  contentQuality: 80,
  readability: 75,
  formattingScore: 90,
  sectionScores: {
    summary: 80,
    experience: 70,
    skills: 90,
    education: 60,
    projects: 50,
    achievements: 40,
  },
});

// AI output with no suggestions and no skill pool → ensureFallbackSuggestions returns [].
const AI_RESULT_EMPTY = {
  atsScore: 71,
  keywordMatch: 60,
  skillMatch: 50,
  contentQuality: 65,
  readability: 70,
  formattingScore: 75,
  strengths: ['Ok'],
  weaknesses: ['Meh'],
  missingKeywords: [{ term: 'react', importance: 'high' as const, reason: '' }],
  matchedKeywords: [{ term: 'node', importance: 'medium' as const }],
  skillAnalysis: {
    matchedSkills: [],
    missingSkills: [],
    transferableSkills: [],
    additionalSkills: [],
    recommendedSkills: [],
  },
  sectionScores: {
    summary: 70,
    experience: 60,
    skills: 80,
    education: 50,
    projects: 40,
    achievements: 30,
  },
  atsIssues: [],
  suggestions: [],
  optimizedSections: {
    professionalSummary: '',
    skills: [],
    experienceBullets: [],
    projectBullets: [],
  },
  optimizedResumeText: '',
};

// AI output exercising every enterpriseOptimization fallback and the fallback-suggestion branch.
const AI_RESULT_RICH = {
  atsScore: 92,
  keywordMatch: 80,
  skillMatch: 75,
  contentQuality: 85,
  readability: 90,
  formattingScore: 88,
  experienceRelevance: 42,
  resumeStrength: 61,
  industryAlignment: 58,
  recruiterReadability: 88,
  interviewReadiness: 70,
  improvedSummary: 'A great summary',
  improvedExperience: ['bullet'],
  improvedProjects: ['proj'],
  improvedSkills: ['react', 'graphql'],
  recommendedSkillOrder: ['graphql', 'react'],
  atsSuggestions: [{ title: 'Fix', description: 'desc' }],
  grammarSuggestions: [{ original: 'x', suggestion: 'y', explanation: 'z' }],
  finalResume: { hello: 'world' },
  strengths: ['Strong'],
  weaknesses: ['Weak'],
  missingSkills: ['docker'],
  additionalSkillsFound: ['aws'],
  missingKeywords: [{ term: 'react', importance: 'high' as const, reason: '' }],
  matchedKeywords: [{ term: 'node', importance: 'medium' as const }],
  skillAnalysis: {
    matchedSkills: ['react'],
    missingSkills: ['docker'],
    transferableSkills: ['x'],
    additionalSkills: null as unknown as string[],
    recommendedSkills: ['k8s'],
  },
  sectionScores: {
    summary: 90,
    experience: 80,
    skills: 85,
    education: 70,
    projects: 60,
    achievements: 55,
  },
  atsIssues: [],
  suggestions: [],
  optimizedSections: {
    professionalSummary: 'Pro summary',
    skills: ['react'],
    experienceBullets: [{ originalText: 'old bullet', optimizedText: 'new bullet' }],
    projectBullets: [],
  },
  optimizedResumeText: 'Optimized full text',
};

const setupJobHappy = () => {
  h.aiValidate.mockResolvedValue({ valid: true });
  h.aiAnalyze.mockResolvedValue(AI_RESULT);
  h.prisma.resumeExtraction.findFirst.mockResolvedValue({
    extractedText: 'Resume text with React and Node experience',
    extractedData: null,
  });
  h.prisma.resume.findUnique.mockResolvedValue({
    id: 'r-1',
    originalName: 'resume.pdf',
    parseRuns: [{ parsedData: null }],
  });
  h.prisma.resumeKeyword.deleteMany.mockResolvedValue({ count: 0 });
  h.prisma.resumeSuggestion.deleteMany.mockResolvedValue({ count: 0 });
  h.prisma.resumeAnalysis.update.mockResolvedValue(analysis());
  h.prisma.resumeKeyword.createMany.mockResolvedValue({ count: 0 });
  h.prisma.resumeSuggestion.createMany.mockResolvedValue({ count: 0 });
};

/** Starts an analysis and flushes the scheduled runAnalysisJob microtask chain. */
const flushAnalysisJob = async (input = INPUT) => {
  vi.useFakeTimers();
  // The caller is responsible for resume.findFirst (assertOwnedResume, used by startAnalysis)
  // and resume.findUnique (getResumeText).
  h.prisma.resumeAnalysis.findFirst.mockResolvedValue(null);
  h.prisma.resumeAnalysis.upsert.mockResolvedValue({ id: 'a-1' });
  const started = await service.startAnalysis(input);
  await vi.runAllTimersAsync();
  return started;
};

beforeEach(() => {
  Object.values(h.prisma).forEach((model) =>
    Object.values(model as Record<string, unknown>).forEach((fn) => {
      if (typeof fn === 'function') vi.mocked(fn).mockReset();
    }),
  );
  h.aiAnalyze.mockReset();
  h.aiValidate.mockReset();
  h.scoreEdited.mockReset();
  h.jdCoverageExtras.current = [];
  // Most methods begin with assertOwnedResume (prisma.resume.findFirst); default it to an
  // owned row so these logic tests pass the guard. Ownership itself is covered by
  // resume-analysis-ownership.test.ts.
  h.prisma.resume.findFirst.mockResolvedValue({ id: 'r-1' });
  // getResumeText still reads the resume row via findUnique (parseRuns / originalName).
  h.prisma.resume.findUnique.mockResolvedValue({ id: 'r-1' });
  // scoreEditedResume is called synchronously (not awaited) in recheckAts.
  h.scoreEdited.mockReturnValue({
    atsScore: 85,
    keywordMatch: 70,
    skillMatch: 65,
    contentQuality: 80,
    readability: 75,
    formattingScore: 90,
    sectionScores: {
      summary: 80,
      experience: 70,
      skills: 90,
      education: 60,
      projects: 50,
      achievements: 40,
    },
  });
  delete process.env.AI_RESUME_ANALYSIS_STALE_MS;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ResumeAnalysisService', () => {
  describe('startAnalysis', () => {
    it('creates an analysis row and schedules the job', async () => {
      vi.useFakeTimers();
      h.prisma.resume.findFirst.mockResolvedValue({ id: 'r-1' });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(null);
      h.prisma.resumeAnalysis.upsert.mockResolvedValue({ id: 'a-1' });

      const result = await service.startAnalysis({
        resumeId: 'r-1',
        targetRole: 'Engineer',
        experienceLevel: 'MID',
        jobDescription: 'jd',
      });

      expect(result).toEqual({ analysisId: 'a-1', status: 'ANALYZING' });
      expect(h.prisma.resumeAnalysis.upsert).toHaveBeenCalled();
    });

    it('throws 404 when the resume does not exist', async () => {
      h.prisma.resume.findFirst.mockResolvedValue(null);
      await expect(
        service.startAnalysis({
          resumeId: 'x',
          targetRole: 'R',
          experienceLevel: 'MID',
          jobDescription: 'j',
        }),
      ).rejects.toThrow('Resume not found');
    });
  });

  describe('getAnalysis', () => {
    it('returns null when there is no analysis', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(null);
      await expect(service.getAnalysis('r-1', 'u-1')).resolves.toBeNull();
    });

    it('marks a stale ANALYZING analysis as failed', async () => {
      const stale = analysis({
        status: 'ANALYZING',
        updatedAt: new Date(Date.now() - 10 * 60 * 1000),
      });
      const failed = analysis({ status: 'FAILED' });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(stale);
      h.prisma.resumeAnalysis.update.mockResolvedValue(failed);

      const result = await service.getAnalysis('r-1', 'u-1');
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalled();
      expect(result?.status).toBe('FAILED');
    });

    it('returns the shaped analysis for a completed one', async () => {
      const complete = analysis();
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(complete);
      const result = await service.getAnalysis('r-1', 'u-1');
      expect(result?.status).toBe('COMPLETED');
      expect(result?.atsScore).toBe(70);
    });

    it('shapes a FAILED row even when the update result lacks analysisDetails', async () => {
      // config caches env at load and numberFromEnv always yields a finite
      // threshold, so a stale ANALYZING row is always updated; the update result
      // may legitimately be missing analysisDetails and must not crash shaping.
      const stale = analysis({
        status: 'ANALYZING',
        updatedAt: new Date(Date.now() - 60 * 60 * 1000),
      });
      const noDetails = { ...analysis({ status: 'FAILED' }), analysisDetails: undefined };
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(stale);
      h.prisma.resumeAnalysis.update.mockResolvedValue(noDetails);

      const result = await service.getAnalysis('r-1', 'u-1');
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalled();
      expect(result?.status).toBe('FAILED');
      expect(result?.atsScore).toBe(70);
    });

    it('keeps a recent ANALYZING analysis as-is', async () => {
      const fresh = analysis({ status: 'ANALYZING', updatedAt: new Date(Date.now() - 1000) });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(fresh);
      const result = await service.getAnalysis('r-1', 'u-1');
      expect(h.prisma.resumeAnalysis.update).not.toHaveBeenCalled();
      expect(result?.status).toBe('ANALYZING');
    });
  });

  describe('updateStep', () => {
    it('returns null without an analysis', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(null);
      await expect(service.updateStep('r-1', 'u-1', 3)).resolves.toBeNull();
    });

    it('updates the step when an analysis exists', async () => {
      const a = analysis();
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      h.prisma.resumeAnalysis.update.mockResolvedValue({ ...a, currentStep: 3 });
      const result = await service.updateStep('r-1', 'u-1', 3);
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalledWith({
        where: { id: 'a-1' },
        data: { currentStep: 3 },
      });
      expect(result?.currentStep).toBe(3);
    });
  });

  describe('getKeywords', () => {
    it('throws when no analysis exists', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(null);
      await expect(service.getKeywords('r-1')).rejects.toThrow('Analysis not found');
    });

    it('partitions keywords by status with reasons', async () => {
      const a = analysis({ analysisDetails: { missingKeywordReasons: { react: 'used once' } } });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      h.prisma.resumeKeyword.findMany.mockResolvedValue([
        { id: 1, term: 'react', status: 'MISSING' },
        { id: 2, term: 'node', status: 'MATCHED' },
        { id: 3, term: 'aws', status: 'PARTIAL' },
      ]);

      const result = await service.getKeywords('r-1');
      expect(result.missing).toHaveLength(1);
      expect(result.missing[0].reason).toBe('used once');
      expect(result.matched).toHaveLength(1);
      expect(result.partial).toHaveLength(1);
    });

    it('returns partitions without reasons when details are missing', async () => {
      const a = analysis({ analysisDetails: null });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      h.prisma.resumeKeyword.findMany.mockResolvedValue([
        { id: 1, term: 'react', status: 'MISSING' },
        { id: 2, term: 'node', status: 'MATCHED' },
      ]);
      const result = await service.getKeywords('r-1');
      expect(result.missing[0].reason).toBeUndefined();
      expect(result.matched).toHaveLength(1);
    });
  });

  describe('getSuggestions', () => {
    it('returns an empty list without an analysis', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(null);
      await expect(service.getSuggestions('r-1')).resolves.toEqual([]);
    });

    it('lists suggestions for the analysis', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(analysis());
      h.prisma.resumeSuggestion.findMany.mockResolvedValue([{ id: 1, title: 'Add keywords' }]);
      const result = await service.getSuggestions('r-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('applySuggestion', () => {
    it('throws when the analysis is missing', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(null);
      await expect(service.applySuggestion('r-1', 1)).rejects.toThrow('Analysis not found');
    });

    it('throws when the suggestion is missing', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(analysis());
      h.prisma.resumeSuggestion.findFirst.mockResolvedValue(null);
      await expect(service.applySuggestion('r-1', 1)).rejects.toThrow('Suggestion not found');
    });

    it('only marks status when preserveContent is set', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(analysis());
      h.prisma.resumeSuggestion.findFirst.mockResolvedValue({
        id: 1,
        originalText: '',
        suggestedText: '',
      });
      h.prisma.resumeSuggestion.update.mockResolvedValue({ id: 1, status: 'APPLIED' });
      const result = await service.applySuggestion('r-1', 1, undefined, { preserveContent: true });
      expect(h.prisma.resumeAnalysis.update).not.toHaveBeenCalled();
      expect(result.status).toBe('APPLIED');
    });

    it('replaces text in the skills section when the excerpt drifted', async () => {
      const a = analysis({ editedContent: 'Skills: Java' });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      h.prisma.resumeSuggestion.findFirst.mockResolvedValue({
        id: 1,
        category: 'skills',
        originalText: '',
        suggestedText: 'React',
      });
      h.prisma.resumeSuggestion.update.mockResolvedValue({ id: 1 });
      h.prisma.resumeAnalysis.update.mockResolvedValue({});
      await service.applySuggestion('r-1', 1);
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ editedContent: expect.stringContaining('React') }),
        }),
      );
    });

    it('appends a new section header when the category is absent', async () => {
      const a = analysis({ editedContent: 'Summary text' });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      h.prisma.resumeSuggestion.findFirst.mockResolvedValue({
        id: 1,
        category: 'projects',
        originalText: '',
        suggestedText: 'Built X',
      });
      h.prisma.resumeSuggestion.update.mockResolvedValue({ id: 1 });
      h.prisma.resumeAnalysis.update.mockResolvedValue({});
      await service.applySuggestion('r-1', 1);
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ editedContent: expect.stringContaining('PROJECTS') }),
        }),
      );
    });

    it('uses the suggested text directly when content is empty', async () => {
      const a = analysis({ editedContent: '' });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      h.prisma.resumeSuggestion.findFirst.mockResolvedValue({
        id: 1,
        category: '',
        originalText: '',
        suggestedText: 'Fresh',
      });
      h.prisma.resumeSuggestion.update.mockResolvedValue({ id: 1 });
      h.prisma.resumeAnalysis.update.mockResolvedValue({});
      await service.applySuggestion('r-1', 1);
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ editedContent: 'Fresh' }) }),
      );
    });
  });

  describe('ignoreSuggestion', () => {
    it('ignores a suggestion and marks it IGNORED', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(analysis());
      h.prisma.resumeSuggestion.findFirst.mockResolvedValue({ id: 2 });
      h.prisma.resumeSuggestion.update.mockResolvedValue({ id: 2, status: 'IGNORED' });
      const result = await service.ignoreSuggestion('r-1', 2);
      expect(result.status).toBe('IGNORED');
    });

    it('throws when the suggestion is missing', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(analysis());
      h.prisma.resumeSuggestion.findFirst.mockResolvedValue(null);
      await expect(service.ignoreSuggestion('r-1', 2)).rejects.toThrow('Suggestion not found');
    });

    it('throws when the analysis is missing', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(null);
      await expect(service.ignoreSuggestion('r-1', 2)).rejects.toThrow('Analysis not found');
    });
  });

  describe('updateContent', () => {
    it('throws without an analysis', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(null);
      await expect(service.updateContent('r-1', 'u-1', 'x')).rejects.toThrow('Analysis not found');
    });

    it('persists edited content', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(analysis());
      h.prisma.resumeAnalysis.update.mockResolvedValue({});
      await service.updateContent('r-1', 'u-1', 'new content');
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalledWith({
        where: { id: 'a-1' },
        data: { editedContent: 'new content' },
      });
    });
  });

  describe('recheckAts', () => {
    it('recomputes the score and refreshes skill analysis', async () => {
      const a = analysis({
        keywords: [{ id: 1, term: 'react', status: 'MATCHED' }],
        suggestions: [{ id: 1, status: 'APPLIED' }],
      });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      h.prisma.resumeAnalysis.update.mockResolvedValue({});
      h.prisma.resumeKeyword.update.mockResolvedValue({});
      h.scoreEdited.mockReturnValue({
        atsScore: 85,
        keywordMatch: 70,
        skillMatch: 65,
        contentQuality: 80,
        readability: 75,
        formattingScore: 90,
        sectionScores: {
          summary: 80,
          experience: 70,
          skills: 90,
          education: 60,
          projects: 50,
          achievements: 40,
        },
      });

      const result = await service.recheckAts('r-1');
      expect(result.atsScore).toBe(85);
      expect(result.previousAtsScore).toBe(70);
      expect(result.improvement).toBe(15);
      expect(result.grade).toBeTypeOf('string');
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalled();
    });
  });

  describe('versions', () => {
    it('saveVersion throws without an analysis', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(null);
      await expect(service.saveVersion('r-1', 'u-1', 'v1')).rejects.toThrow('Analysis not found');
    });

    it('saveVersion creates a version row', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(analysis());
      h.prisma.resumeVersion.create.mockResolvedValue({ id: 1 });
      const result = await service.saveVersion('r-1', 'u-1', 'v1', 'override content');
      expect(h.prisma.resumeVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ content: 'override content', label: 'v1' }),
        }),
      );
      expect(result.id).toBe(1);
    });

    it('getVersions returns an empty list without an analysis', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(null);
      await expect(service.getVersions('r-1', 'u-1')).resolves.toEqual([]);
    });

    it('getVersions maps version rows', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(analysis());
      h.prisma.resumeVersion.findMany.mockResolvedValue([{ id: 1, label: 'v', content: 'c' }]);
      const result = await service.getVersions('r-1', 'u-1');
      expect(result[0].resumeId).toBe('r-1');
    });

    it('listSavedVersions returns mapped rows', async () => {
      h.prisma.resumeVersion.findMany.mockResolvedValue([
        {
          id: 1,
          label: 'v',
          content: 'c',
          atsScore: 80,
          createdAt: new Date(),
          targetRole: null,
          jobDescription: null,
          resumeFileName: null,
          analysis: {
            resumeId: 'r-1',
            targetRole: 'T',
            jobDescription: 'J',
            resume: { originalName: 'n.pdf' },
          },
        },
      ]);
      const result = await service.listSavedVersions('u-1');
      expect(result[0].resumeId).toBe('r-1');
      expect(result[0].resumeFileName).toBe('n.pdf');
    });

    it('getSavedVersion throws when missing', async () => {
      h.prisma.resumeVersion.findFirst.mockResolvedValue(null);
      await expect(service.getSavedVersion(9, 'u-1')).rejects.toThrow(
        'Saved resume version not found',
      );
    });

    it('getSavedVersion returns the version', async () => {
      h.prisma.resumeVersion.findFirst.mockResolvedValue({
        id: 1,
        label: 'v',
        content: 'c',
        atsScore: 80,
        createdAt: new Date(),
        targetRole: 'T',
        jobDescription: 'J',
        resumeFileName: 'n.pdf',
        analysis: { resumeId: 'r-1', resume: { originalName: 'n.pdf' } },
      });
      const result = await service.getSavedVersion(1, 'u-1');
      expect(result.resumeId).toBe('r-1');
    });

    it('getSavedVersion fills null fields from the analysis', async () => {
      h.prisma.resumeVersion.findFirst.mockResolvedValue({
        id: 1,
        label: 'v',
        content: 'c',
        atsScore: 80,
        createdAt: new Date(),
        targetRole: null,
        jobDescription: null,
        resumeFileName: null,
        analysis: {
          resumeId: 'r-1',
          targetRole: 'T',
          jobDescription: 'J',
          resume: { originalName: 'n.pdf' },
        },
      });
      const result = await service.getSavedVersion(1, 'u-1');
      expect(result.targetRole).toBe('T');
      expect(result.jobDescription).toBe('J');
      expect(result.resumeFileName).toBe('n.pdf');
    });

    it('deleteSavedVersion throws when missing', async () => {
      h.prisma.resumeVersion.findFirst.mockResolvedValue(null);
      await expect(service.deleteSavedVersion(9, 'u-1')).rejects.toThrow(
        'Saved resume version not found',
      );
    });

    it('deleteSavedVersion deletes and returns the id', async () => {
      // deleteSavedVersion walks version -> analysis -> resume via the nested where clause;
      // the owning user's row just needs to exist.
      h.prisma.resumeVersion.findFirst.mockResolvedValue({ id: 5, analysis: { resume: {} } });
      h.prisma.resumeVersion.delete.mockResolvedValue({});
      await expect(service.deleteSavedVersion(5, 'u-1')).resolves.toEqual({ id: 5 });
    });
  });

  describe('exportResume', () => {
    const setupExport = () => {
      // assertOwnedResume reads the resume row via findFirst (originalName feeds the filename).
      h.prisma.resume.findFirst.mockResolvedValue({ id: 'r-1', originalName: 'my-resume.pdf' });
      // getResumeText reads resume.parseRuns[0].parsedData, so include it.
      h.prisma.resume.findUnique.mockResolvedValue({
        id: 'r-1',
        originalName: 'my-resume.pdf',
        parseRuns: [{ parsedData: { text: 'parsed data text' } }],
      });
      h.prisma.resumeExtraction.findFirst.mockResolvedValue({ extractedText: 'raw resume text' });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(null);
    };

    it('exports as txt', async () => {
      setupExport();
      const result = await service.exportResume('r-1', 'u-1', 'txt');
      expect(result.mimeType).toBe('text/plain');
      expect(result.fileName).toBe('my-resume_optimized.txt');
      expect(Buffer.from(result.content, 'base64').toString()).toContain('ATS Score: 0/100');
    });

    it('exports as pdf', async () => {
      setupExport();
      const result = await service.exportResume('r-1', 'u-1', 'pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.fileName).toBe('my-resume_optimized.pdf');
    });

    it('exports as docx', async () => {
      setupExport();
      const result = await service.exportResume('r-1', 'u-1', 'docx');
      expect(result.mimeType).toContain('wordprocessingml');
    });

    it('throws on an unsupported format', async () => {
      setupExport();
      await expect(service.exportResume('r-1', 'u-1', 'xml' as never)).rejects.toThrow(
        'Unsupported export format',
      );
    });

    it('throws 404 when the resume is missing', async () => {
      h.prisma.resume.findFirst.mockResolvedValue(null);
      await expect(service.exportResume('r-1', 'u-1', 'txt')).rejects.toThrow('Resume not found');
    });
  });

  describe('runAnalysisJob (flushed through startAnalysis)', () => {
    it('completes a valid analysis end to end', async () => {
      setupJobHappy();
      await flushAnalysisJob();
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'a-1' },
          data: expect.objectContaining({ status: 'COMPLETED', atsScore: 72, currentStep: 3 }),
        }),
      );
      expect(h.prisma.resumeKeyword.deleteMany).toHaveBeenCalled();
      expect(h.prisma.resumeSuggestion.deleteMany).toHaveBeenCalled();
      expect(h.prisma.resumeKeyword.createMany).toHaveBeenCalled();
      expect(h.prisma.resumeSuggestion.createMany).toHaveBeenCalled();
    });

    it('blocks an invalid target role with an ATS 0 row', async () => {
      h.aiValidate.mockResolvedValue({ valid: false, message: 'Bad role' });
      h.prisma.resume.findUnique.mockResolvedValue({ id: 'r-1' });
      h.prisma.resumeKeyword.deleteMany.mockResolvedValue({ count: 0 });
      h.prisma.resumeSuggestion.deleteMany.mockResolvedValue({ count: 0 });
      h.prisma.resumeAnalysis.update.mockResolvedValue(analysis({ status: 'COMPLETED' }));
      await flushAnalysisJob();
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            atsScore: 0,
            status: 'COMPLETED',
            weaknesses: ['Bad role'],
          }),
        }),
      );
      expect(h.prisma.resumeKeyword.createMany).not.toHaveBeenCalled();
      expect(h.prisma.resumeSuggestion.createMany).not.toHaveBeenCalled();
    });

    it('uses the default gate message when none is provided', async () => {
      h.aiValidate.mockResolvedValue({ valid: false, message: '   ' });
      h.prisma.resume.findUnique.mockResolvedValue({ id: 'r-1' });
      h.prisma.resumeKeyword.deleteMany.mockResolvedValue({ count: 0 });
      h.prisma.resumeSuggestion.deleteMany.mockResolvedValue({ count: 0 });
      h.prisma.resumeAnalysis.update.mockResolvedValue(analysis({ status: 'COMPLETED' }));
      await flushAnalysisJob();
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            weaknesses: [
              'Oops! You added a wrong Target Role and Job Description. Please check them and try again.',
            ],
          }),
        }),
      );
    });

    it('marks the analysis FAILED when the AI provider throws', async () => {
      h.aiValidate.mockResolvedValue({ valid: true });
      h.aiAnalyze.mockRejectedValue(new Error('provider down'));
      h.prisma.resumeExtraction.findFirst.mockResolvedValue({
        extractedText: 'Some text',
        extractedData: null,
      });
      h.prisma.resume.findUnique.mockResolvedValue({
        id: 'r-1',
        originalName: 'r.pdf',
        parseRuns: [{ parsedData: null }],
      });
      h.prisma.resumeAnalysis.update.mockResolvedValue(analysis({ status: 'FAILED' }));
      await flushAnalysisJob();
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILED',
            weaknesses: ['Analysis failed: provider down'],
          }),
        }),
      );
    });

    it('runs the full enterprise optimization path with rich AI output', async () => {
      h.aiValidate.mockResolvedValue({ valid: true });
      h.aiAnalyze.mockResolvedValue(AI_RESULT_RICH);
      h.prisma.resumeExtraction.findFirst.mockResolvedValue({
        extractedText: 'Resume text',
        extractedData: null,
      });
      h.prisma.resume.findUnique.mockResolvedValue({
        id: 'r-1',
        originalName: 'resume.pdf',
        parseRuns: [{ parsedData: null }],
      });
      h.prisma.resumeKeyword.deleteMany.mockResolvedValue({ count: 0 });
      h.prisma.resumeSuggestion.deleteMany.mockResolvedValue({ count: 0 });
      h.prisma.resumeAnalysis.update.mockResolvedValue(analysis());
      h.prisma.resumeKeyword.createMany.mockResolvedValue({ count: 0 });
      h.prisma.resumeSuggestion.createMany.mockResolvedValue({ count: 0 });
      await flushAnalysisJob();
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ atsScore: 92, status: 'COMPLETED' }),
        }),
      );
      // No AI suggestions and no JD-coverage extras → the fallback skill suggestion is created.
      expect(h.prisma.resumeSuggestion.createMany).toHaveBeenCalledTimes(1);
    });

    it('creates no suggestions when the AI returns none and no skills are missing', async () => {
      h.aiValidate.mockResolvedValue({ valid: true });
      h.aiAnalyze.mockResolvedValue(AI_RESULT_EMPTY);
      h.prisma.resumeExtraction.findFirst.mockResolvedValue({
        extractedText: 'Resume text',
        extractedData: null,
      });
      h.prisma.resume.findUnique.mockResolvedValue({
        id: 'r-1',
        originalName: 'resume.pdf',
        parseRuns: [{ parsedData: null }],
      });
      h.prisma.resumeKeyword.deleteMany.mockResolvedValue({ count: 0 });
      h.prisma.resumeSuggestion.deleteMany.mockResolvedValue({ count: 0 });
      h.prisma.resumeAnalysis.update.mockResolvedValue(analysis());
      h.prisma.resumeKeyword.createMany.mockResolvedValue({ count: 0 });
      h.prisma.resumeSuggestion.createMany.mockResolvedValue({ count: 0 });
      await flushAnalysisJob();
      expect(h.prisma.resumeSuggestion.createMany).not.toHaveBeenCalled();
      expect(h.prisma.resumeKeyword.createMany).toHaveBeenCalled();
    });

    it('grounds JD coverage suggestions with the current summary excerpt', async () => {
      h.jdCoverageExtras.current = [
        {
          category: 'summary',
          title: 'Sharpen summary',
          suggestedText: 'New summary',
          originalText: 'Stale',
        },
        { category: 'skills', title: 'Add skill', suggestedText: 'AWS', originalText: '' },
      ];
      setupJobHappy();
      h.prisma.resumeExtraction.findFirst.mockResolvedValue({
        extractedText:
          'Professional Summary: This candidate has over ten years of experience building distributed systems\nWork Experience: acme',
        extractedData: null,
      });
      await flushAnalysisJob();
      expect(h.prisma.resumeSuggestion.createMany).toHaveBeenCalled();
      const data = vi.mocked(h.prisma.resumeSuggestion.createMany).mock.calls[0][0].data as Array<{
        category: string;
        originalText: string;
      }>;
      expect(
        data.some((s) => s.category === 'summary' && s.originalText.includes('ten years')),
      ).toBe(true);
    });

    it('handles a minimal AI result with no extras', async () => {
      h.aiValidate.mockResolvedValue({ valid: true });
      // Omit optional keys entirely so the ?? [] fallbacks in toAnalysisDetails /
      // ensureFallbackSuggestions / keywordData are exercised.
      h.aiAnalyze.mockResolvedValue({
        atsScore: 60,
        keywordMatch: 40,
        skillMatch: 30,
        contentQuality: 50,
        readability: 50,
        formattingScore: 55,
      });
      h.prisma.resumeExtraction.findFirst.mockResolvedValue({
        extractedText: 'Resume text',
        extractedData: null,
      });
      h.prisma.resume.findUnique.mockResolvedValue({
        id: 'r-1',
        originalName: 'resume.pdf',
        parseRuns: [{ parsedData: null }],
      });
      h.prisma.resumeKeyword.deleteMany.mockResolvedValue({ count: 0 });
      h.prisma.resumeSuggestion.deleteMany.mockResolvedValue({ count: 0 });
      h.prisma.resumeAnalysis.update.mockResolvedValue(analysis());
      await flushAnalysisJob();
      expect(h.prisma.resumeKeyword.createMany).not.toHaveBeenCalled();
      expect(h.prisma.resumeSuggestion.createMany).not.toHaveBeenCalled();
    });

    it('prefers the original base when skills look cross-domain', async () => {
      h.aiValidate.mockResolvedValue({ valid: true });
      h.aiAnalyze.mockResolvedValue({
        ...AI_RESULT,
        skillAnalysis: {
          ...AI_RESULT.skillAnalysis,
          matchedSkills: [],
          missingSkills: ['docker', 'k8s'],
        },
      });
      h.prisma.resumeExtraction.findFirst.mockResolvedValue({
        extractedText: 'Resume text',
        extractedData: null,
      });
      h.prisma.resume.findUnique.mockResolvedValue({
        id: 'r-1',
        originalName: 'resume.pdf',
        parseRuns: [{ parsedData: null }],
      });
      h.prisma.resumeKeyword.deleteMany.mockResolvedValue({ count: 0 });
      h.prisma.resumeSuggestion.deleteMany.mockResolvedValue({ count: 0 });
      h.prisma.resumeAnalysis.update.mockResolvedValue(analysis());
      h.prisma.resumeKeyword.createMany.mockResolvedValue({ count: 0 });
      h.prisma.resumeSuggestion.createMany.mockResolvedValue({ count: 0 });
      await flushAnalysisJob();
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) }),
      );
    });

    it('survives a non-Error rejection and a failing failure-update', async () => {
      h.aiValidate.mockResolvedValue({ valid: true });
      h.aiAnalyze.mockRejectedValue('boom-string');
      h.prisma.resumeExtraction.findFirst.mockResolvedValue({
        extractedText: 'Some text',
        extractedData: null,
      });
      h.prisma.resume.findUnique.mockResolvedValue({
        id: 'r-1',
        originalName: 'r.pdf',
        parseRuns: [{ parsedData: null }],
      });
      // The failure-status update itself rejects → exercises the .catch(() => undefined) swallow.
      h.prisma.resumeAnalysis.update.mockRejectedValue(new Error('update failed'));
      await flushAnalysisJob();
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILED',
            weaknesses: ['Analysis failed: boom-string'],
          }),
        }),
      );
    });

    it('fills the fallback insights and skill suggestion for sparse AI output', async () => {
      h.aiValidate.mockResolvedValue({ valid: true });
      h.aiAnalyze.mockResolvedValue({
        atsScore: 65,
        keywordMatch: 50,
        skillMatch: 40,
        contentQuality: 60,
        readability: 55,
        formattingScore: 60,
        strengths: [''],
        weaknesses: ['', 'Already has skill gap present'],
        atsIssues: [
          { issue: '', fix: '' },
          { issue: 'Skill gap detected', section: 'experience', severity: 'HIGH', fix: 'Add x' },
        ],
        missingKeywords: [
          { term: 'react', importance: 'high', reason: 'used' },
          { term: 'node', importance: 'high', reason: undefined },
        ],
        skillAnalysis: {
          matchedSkills: ['react'],
          missingSkills: ['docker', ''],
          transferableSkills: [],
          additionalSkills: [],
          recommendedSkills: ['k8s'],
        },
        sectionScores: {
          summary: 60,
          experience: 50,
          skills: 70,
          education: 40,
          projects: 30,
          achievements: 20,
        },
        optimizedSections: {
          professionalSummary: 'Summary',
          skills: ['react'],
          experienceBullets: [{ originalText: '', optimizedText: 'new' }],
          projectBullets: [],
        },
        optimizedResumeText: 'Optimized',
      });
      h.prisma.resumeExtraction.findFirst.mockResolvedValue({
        extractedText: 'Resume text',
        extractedData: null,
      });
      h.prisma.resume.findUnique.mockResolvedValue({
        id: 'r-1',
        originalName: 'resume.pdf',
        parseRuns: [{ parsedData: null }],
      });
      h.prisma.resumeKeyword.deleteMany.mockResolvedValue({ count: 0 });
      h.prisma.resumeSuggestion.deleteMany.mockResolvedValue({ count: 0 });
      h.prisma.resumeAnalysis.update.mockResolvedValue(analysis());
      h.prisma.resumeKeyword.createMany.mockResolvedValue({ count: 0 });
      h.prisma.resumeSuggestion.createMany.mockResolvedValue({ count: 0 });
      await flushAnalysisJob();
      // Empty-strength filter + matched-skill fallback + gap-aware weaknesses.
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            strengths: ['Matched JD skills: react'],
            weaknesses: ['Already has skill gap present'],
          }),
        }),
      );
      // No AI suggestions → the fallback "Add missing JD skills" suggestion is created.
      expect(h.prisma.resumeSuggestion.createMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getResumeText variants through recheckAts', () => {
    const emptyAnalysis = () => analysis({ editedContent: '' });

    it('serializes structured parse data as JSON with a skills appendix', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(emptyAnalysis());
      h.prisma.resumeExtraction.findFirst.mockResolvedValue({
        extractedText: null,
        extractedData: null,
      });
      h.prisma.resume.findUnique.mockResolvedValue({
        id: 'r-1',
        originalName: 'resume.pdf',
        parseRuns: [{ parsedData: { name: 'John', skills: ['react', 'node'] } }],
      });
      await service.recheckAts('r-1');
      expect(h.scoreEdited).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('John') }),
      );
    });

    it('falls back to the resume file name when nothing is extracted', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(emptyAnalysis());
      h.prisma.resumeExtraction.findFirst.mockResolvedValue({
        extractedText: null,
        extractedData: null,
      });
      h.prisma.resume.findUnique.mockResolvedValue({
        id: 'r-1',
        originalName: 'fallback.pdf',
        parseRuns: [{ parsedData: null }],
      });
      await service.recheckAts('r-1');
      expect(h.scoreEdited).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Resume file: fallback.pdf' }),
      );
    });

    it('appends the structured skills appendix to the extracted text', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(emptyAnalysis());
      h.prisma.resumeExtraction.findFirst.mockResolvedValue({
        extractedText: '  Lead engineer  ',
        extractedData: null,
      });
      h.prisma.resume.findUnique.mockResolvedValue({
        id: 'r-1',
        originalName: 'resume.pdf',
        parseRuns: [{ parsedData: { skills: ['react', 'node'] } }],
      });
      await service.recheckAts('r-1');
      expect(h.scoreEdited).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('SKILLS') }),
      );
    });

    it('collects skills from object-shaped skill blocks', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(emptyAnalysis());
      h.prisma.resumeExtraction.findFirst.mockResolvedValue({
        extractedText: null,
        extractedData: null,
      });
      h.prisma.resume.findUnique.mockResolvedValue({
        id: 'r-1',
        originalName: 'resume.pdf',
        parseRuns: [
          {
            parsedData: {
              skills: [
                { name: 'React' },
                { skill: 'Node.js' },
                { technical: ['AWS'], tools: ['Git'] },
              ],
            },
          },
        ],
      });
      await service.recheckAts('r-1');
      const call = vi.mocked(h.scoreEdited).mock.calls.at(-1);
      const content = (call?.[0] as { content: string }).content;
      expect(content).toContain('SKILLS');
      expect(content).toContain('React');
      expect(content).toContain('Node.js');
    });

    it('propagates a 404 when the resume no longer exists', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(emptyAnalysis());
      h.prisma.resume.findUnique.mockResolvedValue(null);
      await expect(service.recheckAts('r-1')).rejects.toThrow('Resume not found');
    });
  });

  describe('shapeAnalysisResponse via getAnalysis', () => {
    it('maps details, keyword reasons, suggestion reasons and failure info', async () => {
      const a = analysis({
        status: 'FAILED',
        weaknesses: ['Custom failure reason'],
        formattingScore: null as unknown as number,
        analysisDetails: {
          formattingScore: 33,
          skillAnalysis: {
            matchedSkills: ['react'],
            missingSkills: ['docker'],
            transferableSkills: [],
            additionalSkills: [],
            recommendedSkills: [],
          },
          sectionScores: {
            summary: 1,
            experience: 1,
            skills: 1,
            education: 1,
            projects: 1,
            achievements: 1,
          },
          atsIssues: [],
          optimizedSections: {
            professionalSummary: 'Sum line',
            skills: [],
            experienceBullets: [],
            projectBullets: [],
          },
          optimizedResumeText: '',
          missingKeywordReasons: { react: 'rarely used' },
          baselineAtsScore: 55,
          invalidTarget: true,
          invalidTargetMessage: 'Nope',
        },
        keywords: [
          { id: 1, term: 'react', status: 'MISSING', importance: 'high' },
          { id: 2, term: 'node', status: 'MATCHED', importance: 'high' },
        ],
        suggestions: [
          {
            id: 1,
            title: 't',
            category: 'c',
            originalText: '',
            suggestedText: '',
            reason: 'why',
            impact: 'HIGH',
            status: 'OPEN',
          },
        ],
      });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      const result = (await service.getAnalysis('r-1', 'u-1')) as unknown as {
        failureReason?: string;
        invalidTarget?: boolean;
        invalidTargetMessage?: string;
        formattingScore?: number;
        baselineAtsScore?: number;
        optimizedSummary?: string;
        keywords: Array<{ reason?: string }>;
        suggestions: Array<{ reason?: string }>;
      };
      expect(result?.failureReason).toBe('Custom failure reason');
      expect(result?.invalidTarget).toBe(true);
      expect(result?.invalidTargetMessage).toBe('Nope');
      expect(result?.formattingScore).toBe(33);
      expect(result?.baselineAtsScore).toBe(55);
      expect(result?.optimizedSummary).toBe('Sum line');
      expect(result?.keywords[0].reason).toBe('rarely used');
      expect(result?.suggestions[0].reason).toBe('why');
    });

    it('falls back to zero formatting when details are absent', async () => {
      const a = analysis({
        formattingScore: null as unknown as number,
        analysisDetails: null,
        keywords: [{ id: 1, term: 'react', status: 'MATCHED', importance: 'high' }],
        suggestions: [
          {
            id: 1,
            title: 't',
            category: 'c',
            originalText: '',
            suggestedText: '',
            reason: '',
            impact: 'HIGH',
            status: 'OPEN',
          },
        ],
      });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      const result = (await service.getAnalysis('r-1', 'u-1')) as unknown as {
        formattingScore: number;
        suggestions: Array<{ reason?: string }>;
        baselineAtsScore: number;
      };
      expect(result.formattingScore).toBe(0);
      expect(result.suggestions[0].reason).toBeUndefined();
      expect(result.baselineAtsScore).toBe(70);
    });
  });

  describe('recheckAts edge paths', () => {
    it('promotes missing keywords that reappear in the content', async () => {
      const a = analysis({
        editedContent: 'React developer with Node',
        keywords: [
          { id: 1, term: 'react', status: 'MISSING' },
          { id: 2, term: 'php', status: 'MISSING' },
        ],
        suggestions: [],
      });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      h.prisma.resumeAnalysis.update.mockResolvedValue({});
      h.prisma.resumeKeyword.update.mockResolvedValue({});
      await service.recheckAts('r-1');
      expect(h.prisma.resumeKeyword.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'MATCHED' },
      });
      expect(h.prisma.resumeKeyword.update).toHaveBeenCalledTimes(1);
    });

    const gradeCases = [
      { atsScore: 95, grade: 'A+' },
      { atsScore: 75, grade: 'B+' },
      { atsScore: 65, grade: 'B' },
      { atsScore: 55, grade: 'C' },
      { atsScore: 45, grade: 'D' },
    ];
    for (const { atsScore, grade } of gradeCases) {
      it(`labels the ${grade} grade band`, async () => {
        h.prisma.resumeAnalysis.findFirst.mockResolvedValue(analysis());
        h.prisma.resumeAnalysis.update.mockResolvedValue({});
        h.scoreEdited.mockReturnValue(scoreReturn(atsScore));
        const result = await service.recheckAts('r-1');
        expect(result.grade).toBe(grade);
      });
    }

    it('throws when the analysis is missing', async () => {
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(null);
      await expect(service.recheckAts('r-1')).rejects.toThrow('Analysis not found');
    });

    it('uses the stored baseline score when details carry one', async () => {
      const a = analysis({ analysisDetails: { baselineAtsScore: 50 } });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      h.prisma.resumeAnalysis.update.mockResolvedValue({});
      const result = await service.recheckAts('r-1');
      expect(result.previousAtsScore).toBe(50);
      expect(result.improvement).toBe(35);
    });

    it('fetches resume text when editedContent is null', async () => {
      const a = analysis({ editedContent: null });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      h.prisma.resumeExtraction.findFirst.mockResolvedValue({
        extractedText: 'Fresh extract',
        extractedData: null,
      });
      h.prisma.resume.findUnique.mockResolvedValue({
        id: 'r-1',
        originalName: 'r.pdf',
        parseRuns: [{ parsedData: null }],
      });
      h.prisma.resumeAnalysis.update.mockResolvedValue({});
      await service.recheckAts('r-1');
      expect(h.scoreEdited).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Fresh extract' }),
      );
    });

    it('tolerates null job description and target role', async () => {
      const a = analysis({ jobDescription: null, targetRole: null });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      h.prisma.resumeAnalysis.update.mockResolvedValue({});
      const result = await service.recheckAts('r-1');
      expect(result.grade).toBeTypeOf('string');
    });
  });

  describe('applySuggestion remaining branches', () => {
    it('replaces an exact original excerpt through fuzzy matching', async () => {
      const a = analysis({ editedContent: 'I know Java well' });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      h.prisma.resumeSuggestion.findFirst.mockResolvedValue({
        id: 1,
        category: 'summary',
        originalText: 'Java',
        suggestedText: 'Java 17',
      });
      h.prisma.resumeSuggestion.update.mockResolvedValue({ id: 1 });
      h.prisma.resumeAnalysis.update.mockResolvedValue({});
      await service.applySuggestion('r-1', 1);
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ editedContent: 'I know Java 17 well' }),
        }),
      );
    });

    it('merges into the skills section when a non-exact excerpt drifts', async () => {
      const a = analysis({ editedContent: 'Skills: Java' });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      h.prisma.resumeSuggestion.findFirst.mockResolvedValue({
        id: 1,
        category: 'skills',
        originalText: 'Ruby on Rails',
        suggestedText: 'React',
      });
      h.prisma.resumeSuggestion.update.mockResolvedValue({ id: 1 });
      h.prisma.resumeAnalysis.update.mockResolvedValue({});
      await service.applySuggestion('r-1', 1);
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ editedContent: expect.stringContaining('React') }),
        }),
      );
    });

    it('appends inside an existing section when the category text is present', async () => {
      const a = analysis({ editedContent: 'Worked across many PROJECTS' });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      h.prisma.resumeSuggestion.findFirst.mockResolvedValue({
        id: 1,
        category: 'projects',
        originalText: '',
        suggestedText: 'Built X',
      });
      h.prisma.resumeSuggestion.update.mockResolvedValue({ id: 1 });
      h.prisma.resumeAnalysis.update.mockResolvedValue({});
      await service.applySuggestion('r-1', 1);
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ editedContent: 'Worked across many PROJECTS\nBuilt X' }),
        }),
      );
    });

    it('skips the content update when the suggested text is empty', async () => {
      const a = analysis({ editedContent: 'Content' });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      h.prisma.resumeSuggestion.findFirst.mockResolvedValue({
        id: 1,
        category: 'x',
        originalText: '',
        suggestedText: '   ',
      });
      h.prisma.resumeSuggestion.update.mockResolvedValue({ id: 1 });
      await service.applySuggestion('r-1', 1);
      expect(h.prisma.resumeAnalysis.update).not.toHaveBeenCalled();
      expect(h.prisma.resumeSuggestion.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'APPLIED' },
      });
    });

    it('starts from empty content when editedContent is null', async () => {
      const a = analysis({ editedContent: null });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      h.prisma.resumeSuggestion.findFirst.mockResolvedValue({
        id: 1,
        category: '',
        originalText: '',
        suggestedText: 'React',
      });
      h.prisma.resumeSuggestion.update.mockResolvedValue({ id: 1 });
      h.prisma.resumeAnalysis.update.mockResolvedValue({});
      await service.applySuggestion('r-1', 1);
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ editedContent: 'React' }) }),
      );
    });

    it('handles a suggestion without original text', async () => {
      const a = analysis({ editedContent: 'Summary text' });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      h.prisma.resumeSuggestion.findFirst.mockResolvedValue({
        id: 1,
        category: 'summary',
        suggestedText: 'New',
      });
      h.prisma.resumeSuggestion.update.mockResolvedValue({ id: 1 });
      h.prisma.resumeAnalysis.update.mockResolvedValue({});
      await service.applySuggestion('r-1', 1);
      expect(h.prisma.resumeAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ editedContent: expect.stringContaining('New') }),
        }),
      );
    });

    it('skips the content update when suggested text is missing', async () => {
      const a = analysis({ editedContent: 'Content' });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      h.prisma.resumeSuggestion.findFirst.mockResolvedValue({
        id: 1,
        category: 'x',
        originalText: 'old',
      });
      h.prisma.resumeSuggestion.update.mockResolvedValue({ id: 1 });
      await service.applySuggestion('r-1', 1);
      expect(h.prisma.resumeAnalysis.update).not.toHaveBeenCalled();
      expect(h.prisma.resumeSuggestion.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'APPLIED' },
      });
    });
  });

  describe('saveVersion content fallback', () => {
    it('falls back to a template when no content exists', async () => {
      const a = analysis({ editedContent: null });
      h.prisma.resumeAnalysis.findFirst.mockResolvedValue(a);
      h.prisma.resumeVersion.create.mockResolvedValue({ id: 1 });
      await service.saveVersion('r-1', 'u-1', 'v2');
      expect(h.prisma.resumeVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: 'Resume optimized for: Engineer\nATS Score: 70',
          }),
        }),
      );
    });
  });
});

describe('error helpers', () => {
  it('AppError preserves statusCode', () => {
    const err = new AppError('boom', 400);
    expect(err.statusCode).toBe(400);
    expect(err.isOperational).toBe(true);
  });
});
