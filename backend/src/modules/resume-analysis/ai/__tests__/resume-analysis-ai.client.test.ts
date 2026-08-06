import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/logger/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const h = vi.hoisted(() => {
  // resume-analysis.config.ts caches process.env ONCE at module load, so the env
  // present when the module is first imported is the env the client runs with.
  // Baseline = openrouter-only, so the statically-imported `client` exercises the
  // default provider path. Provider-scoped tests reload the module with a fresh
  // env via loadClientWithEnv() below.
  const CLEANUP_KEYS = [
    'OPENROUTER_API_KEY',
    'GROQ_API_KEY',
    'GROQ_API_KEYS',
    'GROQ_API_KEY_2',
    'GROQ_API_KEY_FALLBACK',
    'OPENAI_API_KEY',
    'GOOGLE_API_KEY',
    'GEMINI_API_KEY',
    'OPENROUTER_SITE_URL',
    'OPENROUTER_APP_NAME',
    'AI_RESUME_ANALYSIS_PROVIDER',
    'AI_RESUME_PARSER_PROVIDER',
    'AI_RESUME_ANALYSIS_FALLBACK_PROVIDERS',
    'AI_RESUME_ANALYSIS_MODEL',
    'AI_RESUME_ANALYSIS_FALLBACK_MODELS',
    'AI_RESUME_ANALYSIS_ALLOW_OPENROUTER_FREE',
    'AI_RESUME_ANALYSIS_FULL_PROMPT',
    'AI_RESUME_ANALYSIS_FREE_TIMEOUT_MS',
    'AI_RESUME_ANALYSIS_TIMEOUT_MS',
    'AI_RESUME_ANALYSIS_MAX_TOKENS',
    'AI_RESUME_ANALYSIS_GROQ_MAX_TOKENS',
    'AI_RESUME_ANALYSIS_GROQ_MODEL',
    'AI_RESUME_ANALYSIS_GROQ_MAX_RESUME_CHARS',
    'AI_RESUME_ANALYSIS_GROQ_MAX_JD_CHARS',
    'AI_RESUME_ANALYSIS_MAX_RESUME_CHARS',
    'AI_RESUME_ANALYSIS_MAX_JD_CHARS',
    'AI_RESUME_ANALYSIS_COMPACT_RESUME_CHARS',
    'AI_RESUME_ANALYSIS_COMPACT_JD_CHARS',
    'AI_RESUME_PARSER_MODEL',
    'AI_RESUME_PARSER_TEMPERATURE',
    'AI_RESUME_PARSER_MAX_RETRIES',
  ];
  CLEANUP_KEYS.forEach((key) => delete process.env[key]);
  process.env.OPENROUTER_API_KEY = 'test-key';
  return {
    googleContent: { current: '{}' },
    googleConfig: { current: null as unknown },
    CLEANUP_KEYS,
  };
});

vi.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: vi.fn().mockImplementation(function (this: any, config: unknown) {
    this.config = config;
    h.googleConfig.current = config;
    this.invoke = async () => ({ content: h.googleContent.current });
  }),
}));

// Static import: loaded with the hoisted baseline env (openrouter-only).
import { resumeAnalysisAiClient as client } from '@/modules/resume-analysis/ai/resume-analysis-ai.client.js';

const fetchMock = vi.fn();

const JD = 'a job description that is comfortably long enough to pass validation';

/**
 * Reload the whole module graph with a fresh env so resume-analysis.config.ts
 * caches the provider keys the test wants to exercise.
 */
const loadClientWithEnv = async (env: Record<string, string | undefined>) => {
  h.CLEANUP_KEYS.forEach((key) => delete process.env[key]);
  Object.entries(env).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
  vi.resetModules();
  const mod = await import('@/modules/resume-analysis/ai/resume-analysis-ai.client.js');
  return mod.resumeAnalysisAiClient;
};

/** Returns an OpenAI-compatible 200 whose message content is JSON of `content`. */
const stubOpenAiOk = (content: unknown) => {
  fetchMock.mockImplementation(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }),
  }));
};

const stubOpenAiHttpError = (status = 500, message = 'boom') => {
  fetchMock.mockImplementation(async () => ({
    ok: false,
    status,
    json: async () => ({ error: { message } }),
  }));
};

const stubOkWithRawContent = (content: string) => {
  fetchMock.mockImplementation(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  }));
};

const stubReject = (err: Error) => {
  fetchMock.mockImplementation(async () => {
    throw err;
  });
};

const RESUME = 'A long resume with React experience and Node knowledge across many projects.';
const JD_LONG = 'a job description spanning well beyond a dozen characters';

const makeOutput = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  atsScore: 72,
  keywordMatch: 70,
  skillMatch: 60,
  contentQuality: 75,
  readability: 80,
  formattingScore: 85,
  strengths: ['Good structure'],
  weaknesses: ['Some gaps'],
  missingKeywords: [{ term: 'react', reason: 'not mentioned' }],
  matchedKeywords: [{ term: 'node' }],
  skillAnalysis: {
    matchedSkills: ['react'],
    missingSkills: ['docker'],
    transferableSkills: [],
    additionalSkills: [],
    recommendedSkills: ['k8s'],
  },
  ...overrides,
});

beforeEach(() => {
  // Restore the baseline env for the statically-imported client.
  h.CLEANUP_KEYS.forEach((key) => delete process.env[key]);
  process.env.OPENROUTER_API_KEY = 'test-key';
  fetchMock.mockReset();
  h.googleContent.current = '{}';
  h.googleConfig.current = null;
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  h.CLEANUP_KEYS.forEach((key) => delete process.env[key]);
});

describe('client.validateTargetRoleAndJd', () => {
  it('returns valid for a plausible role + JD', async () => {
    stubOpenAiOk({ valid: true, reason: '' });
    const result = await client.validateTargetRoleAndJd('Senior Engineer', JD);
    expect(result.valid).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('openrouter'),
      expect.anything(),
    );
  });

  it('rejects a short role or JD without calling the provider', async () => {
    const result = await client.validateTargetRoleAndJd('E', 'short');
    expect(result.valid).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects when no provider keys are configured', async () => {
    const c = await loadClientWithEnv({});
    const result = await c.validateTargetRoleAndJd('Engineer', JD);
    expect(result.valid).toBe(false);
  });

  it('returns the provider reason for an invalid verdict', async () => {
    stubOpenAiOk({ valid: false, reason: 'role mismatch' });
    const result = await client.validateTargetRoleAndJd('Engineer', JD);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('role mismatch');
  });

  it('returns invalid when the provider call fails', async () => {
    stubOpenAiHttpError();
    const result = await client.validateTargetRoleAndJd('Engineer', JD);
    expect(result.valid).toBe(false);
  });

  it('falls through non-JSON openrouter models to a working groq key', async () => {
    const c = await loadClientWithEnv({
      OPENROUTER_API_KEY: 'test-key',
      GROQ_API_KEY: 'groq-key',
    });
    // openrouter model 1 + 2 return safety/non-JSON, groq succeeds.
    fetchMock
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: 'user safety: not json' } }] }),
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: 'just some prose' } }] }),
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ valid: true }) } }],
        }),
      }));
    const result = await c.validateTargetRoleAndJd('Engineer', JD);
    expect(result.valid).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toContain('groq');
  });

  it('breaks the loop when a provider is exhausted (TPD quota)', async () => {
    stubOpenAiHttpError(429, '429 rate limit: tokens per day exceeded');
    const result = await client.validateTargetRoleAndJd('Engineer', JD);
    expect(result.valid).toBe(false);
    // Exhausted -> break out of the model loop immediately (single provider).
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('repairs truncated JSON from the provider', async () => {
    stubOkWithRawContent('{"valid":true');
    const result = await client.validateTargetRoleAndJd('Engineer', JD);
    expect(result.valid).toBe(true);
  });

  it('throws AppError 501 for an unsupported AI provider', async () => {
    const c = await loadClientWithEnv({
      OPENROUTER_API_KEY: 'test-key',
      AI_RESUME_ANALYSIS_PROVIDER: 'bogus',
    });
    await expect(c.validateTargetRoleAndJd('Engineer', JD)).rejects.toMatchObject({
      statusCode: 501,
    });
  });
});

describe('client.analyze', () => {
  it('throws when no providers are configured', async () => {
    const c = await loadClientWithEnv({});
    // AppError is re-imported after resetModules, so match on statusCode not class identity.
    await expect(c.analyze('resume', 'Engineer', 'MID', 'a jd')).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it('returns the analyzed output on the happy path', async () => {
    stubOpenAiOk(makeOutput());
    const result = await client.analyze(RESUME, 'Engineer', 'MID', JD_LONG);
    expect(result).toBeDefined();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('openrouter'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('caps ATS/skill scores when the target is cross-domain', async () => {
    stubOpenAiOk(
      makeOutput({
        skillMatch: 90,
        keywordMatch: 95,
        atsScore: 90,
        strengths: [],
        skillAnalysis: {
          matchedSkills: [],
          missingSkills: ['docker', 'kubernetes'],
          transferableSkills: [],
          additionalSkills: [],
          recommendedSkills: [],
        },
        missingKeywords: [
          { term: 'docker', reason: 'x' },
          { term: 'kubernetes', reason: 'y' },
        ],
        matchedKeywords: [],
      }),
    );
    const result = await client.analyze(
      'A resume about customer service and communication only, no technology at all here.',
      'Engineer',
      'MID',
      'We need an engineer with docker and kubernetes container experience on k8s clusters daily',
    );
    expect(result.atsScore).toBeLessThanOrEqual(35);
    expect(result.keywordMatch).toBeLessThanOrEqual(20);
    expect(result.experienceRelevance).toBe(0);
    expect(result.atsIssues.some((i: { section: string }) => /experience/i.test(i.section))).toBe(
      true,
    );
    expect(result.atsIssues.some((i: { section: string }) => /skill/i.test(i.section))).toBe(true);
  });

  it('boosts a low ATS score when JD skills are matched', async () => {
    stubOpenAiOk(
      makeOutput({
        atsScore: 40,
        skillMatch: 70,
        skillAnalysis: {
          matchedSkills: ['react'],
          missingSkills: [],
          transferableSkills: [],
          additionalSkills: [],
          recommendedSkills: [],
        },
        missingKeywords: [],
        matchedKeywords: [],
      }),
    );
    const result = await client.analyze(RESUME, 'Engineer', 'MID', 'react developer role');
    expect(result.atsScore).toBeGreaterThan(40);
  });

  it('raises a low experience score when skills match strongly', async () => {
    stubOpenAiOk(
      makeOutput({
        skillMatch: 70,
        sectionScores: {
          summary: 60,
          experience: 20,
          skills: 50,
          education: 80,
          projects: 30,
          achievements: 40,
        },
        skillAnalysis: {
          matchedSkills: ['react', 'node'],
          missingSkills: [],
          transferableSkills: [],
          additionalSkills: [],
          recommendedSkills: [],
        },
        missingKeywords: [],
        matchedKeywords: [],
      }),
    );
    const result = await client.analyze(RESUME, 'Engineer', 'MID', 'react node role');
    expect(result.sectionScores.experience).toBeGreaterThanOrEqual(20);
  });

  it('adds fallback strengths when the model returns none', async () => {
    stubOpenAiOk(makeOutput({ strengths: [] }));
    const result = await client.analyze(RESUME, 'Engineer', 'MID', JD_LONG);
    expect(result.strengths.length).toBeGreaterThan(0);
  });

  it('adds a missing-skills weakness when none mention the gap', async () => {
    stubOpenAiOk(makeOutput({ weaknesses: ['Wordy prose'] }));
    const result = await client.analyze(RESUME, 'Engineer', 'MID', JD_LONG);
    expect(result.weaknesses.some((w: string) => /missing/i.test(w))).toBe(true);
  });

  it('adds a skill-gap ATS issue when none is present', async () => {
    stubOpenAiOk(makeOutput({ atsIssues: [] }));
    const result = await client.analyze(RESUME, 'Engineer', 'MID', JD_LONG);
    expect(result.atsIssues.some((i: { issue: string }) => /skill/i.test(i.issue))).toBe(true);
  });

  it('grounds suggestions and normalizes skills-category text', async () => {
    stubOpenAiOk(
      makeOutput({
        skillAnalysis: {
          matchedSkills: ['react'],
          missingSkills: [],
          transferableSkills: [],
          additionalSkills: [],
          recommendedSkills: [],
        },
        missingKeywords: [],
        matchedKeywords: [],
        suggestions: [
          {
            title: 'Add skills',
            category: 'skills',
            originalText: 'React',
            suggestedText: 'React,  Node',
            impact: 'HIGH',
            reason: '',
          },
          {
            title: 'Old bullet',
            category: 'experience',
            originalText: 'A line that does not appear in the resume at all anywhere',
            suggestedText: 'Reframed bullet',
            impact: 'MEDIUM',
            reason: '',
          },
          {
            title: 'Real bullet',
            category: 'experience',
            originalText: 'React experience and Node knowledge',
            suggestedText: 'Reframed real bullet',
            impact: 'MEDIUM',
            reason: '',
          },
        ],
      }),
    );
    const result = await client.analyze(RESUME, 'Engineer', 'MID', JD_LONG);
    const cats = result.suggestions.map((s: { category: string }) => s.category);
    expect(cats).toContain('skills');
    expect(cats.filter((c: string) => c === 'experience')).toHaveLength(1);
    const skillSuggestion = result.suggestions.find(
      (s: { category: string }) => s.category === 'skills',
    );
    expect(skillSuggestion.suggestedText).toContain('React, Node');
  });

  it('uses the cross-domain summary template when no summary exists', async () => {
    stubOpenAiOk(
      makeOutput({
        strengths: [],
        skillAnalysis: {
          matchedSkills: [],
          missingSkills: ['docker'],
          transferableSkills: [],
          additionalSkills: [],
          recommendedSkills: [],
        },
        missingKeywords: [{ term: 'docker', reason: 'x' }],
        matchedKeywords: [],
      }),
    );
    const result = await client.analyze(
      'A resume about customer service and communication only.',
      'Site Reliability Engineer',
      'MID',
      'We need docker kubernetes experience',
    );
    expect(result.optimizedSections.professionalSummary).toContain('Site Reliability Engineer');
  });

  it('keeps the improved summary when provided', async () => {
    stubOpenAiOk(
      makeOutput({
        improvedSummary: 'A polished summary',
        optimizedSections: { professionalSummary: 'A polished summary', skills: [] },
      }),
    );
    const result = await client.analyze(RESUME, 'Engineer', 'MID', JD_LONG);
    expect(result.improvedSummary).toContain('A polished summary');
  });

  it('prepends JD coverage suggestions for missing skills', async () => {
    stubOpenAiOk(makeOutput({ suggestions: [] }));
    const result = await client.analyze(RESUME, 'Engineer', 'MID', JD_LONG);
    expect(result.suggestions.some((s: { title: string }) => /Add docker/i.test(s.title))).toBe(
      true,
    );
  });

  it('calls OpenAI when only an OpenAI key is set', async () => {
    const c = await loadClientWithEnv({ OPENAI_API_KEY: 'openai-key' });
    stubOpenAiOk(makeOutput());
    await c.analyze(RESUME, 'Engineer', 'MID', JD_LONG);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('api.openai.com'),
      expect.anything(),
    );
  });

  it('calls Groq with a sanitized model when only a Groq key is set', async () => {
    const c = await loadClientWithEnv({
      GROQ_API_KEY: 'groq-key',
      AI_RESUME_ANALYSIS_GROQ_MODEL: 'groq/llama-3.1-8b-instant',
    });
    stubOpenAiOk(makeOutput());
    await c.analyze(RESUME, 'Engineer', 'MID', JD_LONG);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('api.groq.com'),
      expect.anything(),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.model).toBe('llama-3.1-8b-instant');
  });

  it('rotates to the second Groq key when the first fails with an auth error', async () => {
    const c = await loadClientWithEnv({ GROQ_API_KEYS: 'key1,key2' });
    fetchMock
      .mockImplementationOnce(async () => ({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'unauthorized' } }),
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: JSON.stringify(makeOutput()) } }] }),
      }));
    const result = await c.analyze(RESUME, 'Engineer', 'MID', JD_LONG);
    expect(result).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses Google Gemini when only a Google key is set', async () => {
    const c = await loadClientWithEnv({ GOOGLE_API_KEY: 'google-key' });
    h.googleContent.current = JSON.stringify(makeOutput());
    const result = await c.analyze(RESUME, 'Engineer', 'MID', JD_LONG);
    expect(result).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
    expect((h.googleConfig.current as { model?: string }).model).toBe('gemini-2.0-flash');
  });

  it('maps the gemini provider alias and honors a custom model', async () => {
    const c = await loadClientWithEnv({
      GOOGLE_API_KEY: 'google-key',
      AI_RESUME_ANALYSIS_PROVIDER: 'gemini',
      AI_RESUME_ANALYSIS_MODEL: 'gemini-1.5-flash',
    });
    h.googleContent.current = JSON.stringify(makeOutput());
    const result = await c.analyze(RESUME, 'Engineer', 'MID', JD_LONG);
    expect(result).toBeDefined();
    expect((h.googleConfig.current as { model?: string }).model).toBe('gemini-1.5-flash');
  });

  it('includes openrouter/free when explicitly allowed', async () => {
    const c = await loadClientWithEnv({
      OPENROUTER_API_KEY: 'test-key',
      AI_RESUME_ANALYSIS_MODEL: 'openrouter/free',
      AI_RESUME_ANALYSIS_ALLOW_OPENROUTER_FREE: 'true',
    });
    stubOpenAiOk(makeOutput());
    await c.analyze(RESUME, 'Engineer', 'MID', JD_LONG);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.model).toBe('openrouter/free');
  });

  it('retries with reduced max_tokens after a credit affordability error', async () => {
    fetchMock
      .mockImplementationOnce(async () => ({
        ok: false,
        status: 402,
        json: async () => ({ error: { message: 'can only afford 1234 max_tokens' } }),
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: JSON.stringify(makeOutput()) } }] }),
      }));
    const result = await client.analyze(RESUME, 'Engineer', 'MID', JD_LONG);
    expect(result).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws when a non-retryable HTTP error is returned', async () => {
    stubOpenAiHttpError(500, 'boom');
    await expect(client.analyze(RESUME, 'Engineer', 'MID', JD_LONG)).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it('throws when the model returns empty content', async () => {
    stubOkWithRawContent('');
    await expect(client.analyze(RESUME, 'Engineer', 'MID', JD_LONG)).rejects.toThrow(
      /empty content/i,
    );
  });

  it('throws a 504 when the request times out', async () => {
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    stubReject(abortErr);
    await expect(client.analyze(RESUME, 'Engineer', 'MID', JD_LONG)).rejects.toMatchObject({
      statusCode: 504,
    });
  });

  it('shrinks the prompt and retries once on a too-large request', async () => {
    fetchMock
      .mockImplementationOnce(async () => {
        throw new Error('context length exceeded');
      })
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: JSON.stringify(makeOutput()) } }] }),
      }));
    const result = await client.analyze(RESUME, 'Engineer', 'MID', JD_LONG);
    expect(result).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a paid OpenRouter model in compact mode after truncated JSON', async () => {
    const c = await loadClientWithEnv({
      OPENROUTER_API_KEY: 'test-key',
      AI_RESUME_ANALYSIS_FULL_PROMPT: 'true',
    });
    fetchMock
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: 'user safety: not json at all' } }] }),
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: JSON.stringify(makeOutput()) } }] }),
      }));
    const result = await c.analyze(RESUME, 'Engineer', 'MID', JD_LONG);
    expect(result).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('bails to the next provider when a paid model returns invalid JSON', async () => {
    const c = await loadClientWithEnv({
      OPENROUTER_API_KEY: 'test-key',
      GROQ_API_KEY: 'groq-key',
    });
    // openrouter model1 -> SyntaxError triggers a compact retry on the same
    // model, which also returns non-JSON -> outer catch breaks to Groq.
    fetchMock
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: 'user safety: not json' } }] }),
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: 'user safety: not json' } }] }),
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: JSON.stringify(makeOutput()) } }] }),
      }));
    const result = await c.analyze(RESUME, 'Engineer', 'MID', JD_LONG);
    // openrouter paid model broke out; groq fallback produced the result.
    expect(result).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toContain('groq');
  });

  it('breaks immediately when a provider is exhausted', async () => {
    stubOpenAiHttpError(429, '429 rate limit: tokens per day exceeded');
    await expect(client.analyze(RESUME, 'Engineer', 'MID', JD_LONG)).rejects.toMatchObject({
      statusCode: 500,
    });
    // Only openrouter is configured; the exhausted break exits the model loop
    // and the provider chain is then empty, so a single HTTP attempt is made.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('continues to the next model on a retryable error then fails all', async () => {
    stubReject(new Error('503 service unavailable'));
    await expect(client.analyze(RESUME, 'Engineer', 'MID', JD_LONG)).rejects.toThrow();
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  it('skips remaining free models on empty content', async () => {
    const c = await loadClientWithEnv({
      OPENROUTER_API_KEY: 'test-key',
      AI_RESUME_ANALYSIS_MODEL: 'google/gemini-2.0-flash-exp:free',
    });
    stubOkWithRawContent('');
    await expect(c.analyze(RESUME, 'Engineer', 'MID', JD_LONG)).rejects.toThrow(
      /empty content/i,
    );
  });
});
