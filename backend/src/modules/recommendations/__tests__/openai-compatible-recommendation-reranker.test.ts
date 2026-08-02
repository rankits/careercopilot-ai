import { describe, expect, it, vi } from 'vitest';
import type { EmbeddingHttpClient } from '@/modules/ai-embeddings/providers/embedding-http.client.js';
import type { RecommendationRerankConfig } from '@/modules/recommendations/config/recommendation-rerank.config.js';
import { OpenAICompatibleRecommendationReranker } from '@/modules/recommendations/providers/openai-compatible-recommendation-reranker.js';
import {
  RECOMMENDATION_CONTEXT_SCHEMA_VERSION,
  type RecommendationContext,
  type ScoredJobRecommendation,
} from '@/modules/recommendations/types/recommendations.types.js';

const context = (): RecommendationContext => ({
  userId: 'user-1',
  sourceType: 'PROFILE',
  contextSchemaVersion: RECOMMENDATION_CONTEXT_SCHEMA_VERSION,
  targetTitles: ['Backend Engineer'],
  relatedTitles: [],
  requiredSkills: ['TypeScript'],
  preferredSkills: ['PostgreSQL'],
  industries: ['SaaS'],
  locations: ['Remote'],
  remotePreference: 'REMOTE',
  employmentTypes: ['FULL_TIME'],
  salaryExpectation: { minimum: 100000, currency: 'USD' },
  education: [],
  certifications: [],
  excludedCompanies: [],
  excludedSkills: [],
  sourceText: 'Private candidate summary that must not be sent to rerank',
});

const scored = (jobId: string, score: number): ScoredJobRecommendation => ({
  job: {
    id: jobId,
    title: jobId === 'job-b' ? 'Platform Engineer' : 'Backend Engineer',
    company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
    location: { formatted: 'Remote', remoteType: 'REMOTE' },
    employmentType: 'FULL_TIME',
    salary: { minimum: 120000, maximum: 160000, currency: 'USD' },
    skills: ['TypeScript'],
    publishedAt: null,
    applyUrl: null,
  },
  scoreResult: {
    overallScore: score,
    components: {
      requiredSkills: score,
      title: score,
      experience: score,
      responsibilities: score,
      preferredSkills: score,
      location: score,
      industry: score,
      salary: score,
      qualifications: score,
    },
    matchedSkills: ['TypeScript'],
    aliasSkills: [],
    relatedSkills: [],
    transferableSkills: [],
    missingSkills: [],
    reasons: [],
  },
  category: 'GOOD_MATCH',
  matchType: 'EXACT',
});

const config = (overrides: Partial<RecommendationRerankConfig> = {}): RecommendationRerankConfig => ({
  enabled: true,
  apiKey: 'test-key',
  baseUrl: 'https://rerank.example/v1',
  model: 'rerank-model',
  topN: 2,
  timeoutMs: 500,
  ...overrides,
});

describe('OpenAICompatibleRecommendationReranker', () => {
  it('returns deterministic order without calling HTTP when disabled', async () => {
    const http = { post: vi.fn() } as unknown as EmbeddingHttpClient;
    const reranker = new OpenAICompatibleRecommendationReranker(config({ enabled: false }), http);
    const input = [scored('job-a', 0.9), scored('job-b', 0.8)];

    await expect(reranker.rerank(context(), input)).resolves.toEqual(input);
    expect(http.post).not.toHaveBeenCalled();
  });

  it('reranks only the top N and appends omitted or tail jobs in deterministic order', async () => {
    const post = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ orderedJobIds: ['job-b'] }) } }],
    });
    const reranker = new OpenAICompatibleRecommendationReranker(
      config(),
      { post } as unknown as EmbeddingHttpClient,
    );
    const input = [scored('job-a', 0.9), scored('job-b', 0.8), scored('job-c', 0.7)];

    const output = await reranker.rerank(context(), input);

    expect(output.map((item) => item.job.id)).toEqual(['job-b', 'job-a', 'job-c']);
    expect(post).toHaveBeenCalledWith(
      'https://rerank.example/v1/chat/completions',
      expect.objectContaining({ model: 'rerank-model', temperature: 0 }),
      { authorization: 'Bearer test-key' },
      500,
    );
    const body = post.mock.calls[0]?.[1] as { messages: Array<{ content: string }> };
    expect(body.messages[1]?.content).not.toContain('Private candidate summary');
  });

  it('ignores invented job ids from the provider', async () => {
    const reranker = new OpenAICompatibleRecommendationReranker(
      config(),
      {
        post: vi.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify({ orderedJobIds: ['invented'] }) } }],
        }),
      } as unknown as EmbeddingHttpClient,
    );

    await expect(
      reranker.rerank(context(), [scored('job-a', 0.9), scored('job-b', 0.8)]),
    ).resolves.toEqual([scored('job-a', 0.9), scored('job-b', 0.8)]);
  });
});
