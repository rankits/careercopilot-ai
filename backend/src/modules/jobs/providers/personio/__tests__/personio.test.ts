import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const backoffMocks = vi.hoisted(() => ({
  calculateJitteredBackoff: vi.fn(() => 0),
  sleep: vi.fn(async () => undefined),
}));

vi.mock('@/modules/jobs/utils/backoff.js', () => backoffMocks);

import { PersonioClient } from '@/modules/jobs/providers/personio/client.js';
import { PersonioJobMapper } from '@/modules/jobs/providers/personio/mapper.js';
import { PersonioJobProvider } from '@/modules/jobs/providers/personio/provider.js';
import { ProviderFetchError } from '@/modules/jobs/errors/ProviderFetchError.js';
import { RateLimitError } from '@/modules/jobs/errors/RateLimitError.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';
import { ProviderHealthStatus } from '@/modules/jobs/types/provider.types.js';
import type { PersonioPosition } from '@/modules/jobs/providers/personio/types.js';

const createResponse = (data: unknown, ok = true) =>
  ({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
    text: async () => data as string,
    json: async () => data,
  }) as Response;

const xmlTag = (tag: string, value: string | undefined): string =>
  value === undefined ? '' : `<${tag}>${value}</${tag}>`;

const buildPosition = (
  opts: {
    id?: string;
    name?: string;
    office?: string;
    department?: string;
    recruitingCategory?: string;
    employmentType?: string;
    seniority?: string;
    schedule?: string;
    createdAt?: string;
    descriptionHtml?: string;
  } = {},
) =>
  `<position>${[
    xmlTag('id', opts.id),
    xmlTag('name', opts.name),
    xmlTag('office', opts.office),
    xmlTag('department', opts.department),
    xmlTag('recruitingCategory', opts.recruitingCategory),
    xmlTag('employmentType', opts.employmentType),
    xmlTag('seniority', opts.seniority),
    xmlTag('schedule', opts.schedule),
    xmlTag('createdAt', opts.createdAt),
    xmlTag('descriptionHtml', opts.descriptionHtml),
  ].join('')}</position>`;

const sampleRaw = (overrides: Partial<PersonioPosition> = {}): PersonioPosition => ({
  id: '12345',
  name: 'Software Engineer',
  office: 'Berlin, DE',
  department: 'Engineering',
  recruitingCategory: 'Software',
  employmentType: 'Full-time',
  seniority: 'Senior',
  schedule: 'Full time',
  createdAt: '1000000000',
  descriptionHtml: '<p>Hello &amp; world</p>',
  ...overrides,
});

describe('PersonioClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    backoffMocks.calculateJitteredBackoff.mockReturnValue(0);
    backoffMocks.sleep.mockImplementation(async () => undefined);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    backoffMocks.calculateJitteredBackoff.mockReset();
    backoffMocks.sleep.mockReset();
  });

  it('parses positions from a successful XML response', async () => {
    const xml = `<?xml version="1.0"?><positions>${buildPosition({
      id: '1',
      name: 'A',
      office: 'Berlin',
      department: 'Eng',
      recruitingCategory: 'SW',
      employmentType: 'FT',
      seniority: 'Sr',
      schedule: 'Full',
      createdAt: '1000000000',
    })}${buildPosition({
      id: '2',
      name: 'B',
      office: 'Remote',
      department: 'Design',
      descriptionHtml: '<b>hi</b>',
    })}</positions>`;
    fetchMock.mockResolvedValueOnce(createResponse(xml));

    const client = new PersonioClient('personio', 200);
    const jobs = await client.fetchAccountJobs('acme');

    expect(jobs).toHaveLength(2);
    expect(jobs[0].id).toBe('1');
    expect(jobs[1].office).toBe('Remote');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://acme.jobs.personio.com/xml?language=en',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('decodes CDATA and XML entities inside tag values', async () => {
    const xml = `<positions>${buildPosition({
      id: '1',
      name: '<![CDATA[ Coder &amp; <Creator> ]]>',
      office: '',
      department: undefined,
    })}</positions>`;
    fetchMock.mockResolvedValueOnce(createResponse(xml));
    const jobs = await new PersonioClient('personio').fetchAccountJobs('acme');
    expect(jobs[0].name).toBe('Coder & <Creator>');
    expect(jobs[0].office).toBeUndefined();
    expect(jobs[0].department).toBeUndefined();
  });

  it('returns an empty list when no positions exist', async () => {
    fetchMock.mockResolvedValueOnce(createResponse('<positions></positions>'));
    const jobs = await new PersonioClient('personio').fetchAccountJobs('acme');
    expect(jobs).toEqual([]);
  });

  it('skips positions missing an id or a name and merges jobDescription blocks', async () => {
    const xml = `<positions>
      <position><id>only-id</id></position>
      <position><name>only-name</name></position>
      <position>
        <id>3</id>
        <name>C</name>
        <jobDescription><name>Tasks</name><value>Code</value></jobDescription>
        <jobDescription><name>Bad</name><value></value></jobDescription>
        <jobDescription><value>NoSection</value></jobDescription>
      </position>
    </positions>`;
    fetchMock.mockResolvedValueOnce(createResponse(xml));
    const jobs = await new PersonioClient('personio').fetchAccountJobs('acme');
    expect(jobs).toHaveLength(1);
    expect(jobs[0].descriptionHtml).toBe('Tasks\nCode\n\nBad\n\nNoSection');
  });

  it('throws ProviderFetchError when the response is not ok', async () => {
    fetchMock.mockResolvedValue(createResponse('oops', false));
    const client = new PersonioClient('personio', 200);
    await expect(client.fetchAccountJobs('acme')).rejects.toThrow(
      'Failed to fetch after 3 attempts',
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('propagates abort errors after retries are exhausted', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation was aborted', 'AbortError'));
    const client = new PersonioClient('personio', 1);
    await expect(client.fetchAccountJobs('acme')).rejects.toThrow(ProviderFetchError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('sleeps when a RateLimitError is thrown and then exhausts retries', async () => {
    fetchMock.mockRejectedValue(new RateLimitError('personio', 500));
    const client = new PersonioClient('personio', 200);
    await expect(client.fetchAccountJobs('acme')).rejects.toThrow(
      'Failed to fetch after 3 attempts',
    );
    expect(backoffMocks.sleep).toHaveBeenCalledWith(500);
    expect(backoffMocks.calculateJitteredBackoff).not.toHaveBeenCalled();
  });

  it('backs off between non-rate-limit retries', async () => {
    fetchMock.mockRejectedValue(new Error('boom'));
    const client = new PersonioClient('personio', 200);
    await expect(client.fetchAccountJobs('acme')).rejects.toThrow(
      'Failed to fetch after 3 attempts',
    );
    expect(backoffMocks.calculateJitteredBackoff).toHaveBeenCalledTimes(2);
  });

  it('treats string errors as unknown errors and flips circuit to degraded then open', async () => {
    fetchMock.mockRejectedValue('plain string error');
    const client = new PersonioClient('personio', 200);
    for (let i = 0; i < 5; i += 1) {
      await expect(client.fetchAccountJobs('acme')).rejects.toThrow(ProviderFetchError);
    }
    await expect(client.healthCheck()).resolves.toMatchObject({
      status: ProviderHealthStatus.CIRCUIT_OPEN,
    });
    expect((client as unknown as { consecutiveFailures: number }).consecutiveFailures).toBe(5);
    // Circuit is open: subsequent calls fail immediately without calling fetch.
    const callsBefore = fetchMock.mock.calls.length;
    await expect(client.fetchAccountJobs('acme')).rejects.toThrow(
      'Circuit breaker is OPEN due to consecutive failures',
    );
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
  });

  it('resets failures and returns to healthy on success', async () => {
    fetchMock.mockRejectedValue(new Error('boom'));
    const client = new PersonioClient('personio', 200);
    await expect(client.fetchAccountJobs('acme')).rejects.toThrow(ProviderFetchError);

    fetchMock.mockResolvedValueOnce(createResponse('<positions></positions>'));
    await client.fetchAccountJobs('acme');
    expect((client as unknown as { consecutiveFailures: number }).consecutiveFailures).toBe(0);
    await expect(client.healthCheck()).resolves.toMatchObject({
      status: ProviderHealthStatus.HEALTHY,
    });
  });

  it('uses default timeoutMs when options timeout is undefined', async () => {
    const client = new PersonioClient('personio');
    (client as unknown as { options: { timeoutMs: number } }).options.timeoutMs =
      undefined as never;
    fetchMock.mockResolvedValueOnce(createResponse('<positions></positions>'));
    const jobs = await client.fetchAccountJobs('acme');
    expect(jobs).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports rate limit status and health check', async () => {
    const client = new PersonioClient('personio');
    expect(client.getRateLimitStatus()).toEqual({
      remaining: 1000,
      limit: 1000,
      resetAt: undefined,
    });
    const health = await client.healthCheck();
    expect(health.status).toBe(ProviderHealthStatus.HEALTHY);
    expect(typeof health.lastCheckedAt).toBe('string');
    expect(health.consecutiveFailures).toBe(0);
  });
});

describe('PersonioJobMapper', () => {
  it('maps a full position into a normalized job', () => {
    const mapper = new PersonioJobMapper('Acme Inc', 'acme', ProviderTier.PAID_AUTH);
    const job = mapper.mapToNormalizedJob(sampleRaw());
    expect(job).toMatchObject({
      id: '12345',
      providerJobId: '12345',
      providerName: 'personio',
      providerTier: ProviderTier.PAID_AUTH,
      title: 'Software Engineer',
      companyName: 'Acme Inc',
      location: { raw: 'Berlin, DE', isRemote: false },
      description: 'Hello & world',
      applyUrl: 'https://acme.jobs.personio.com/job/12345',
      tags: ['Engineering', 'Software', 'Full-time', 'Senior', 'Full time'],
    });
    expect(job.postedAt).toBe(new Date(1_000_000_000_000).toISOString());
    expect(job.canonicalHash).toHaveLength(64);
  });

  it('marks a job as remote when the office mentions remote', () => {
    const mapper = new PersonioJobMapper('Acme Inc', 'acme');
    const job = mapper.mapToNormalizedJob(sampleRaw({ office: 'Remote worldwide' }));
    expect(job.location.isRemote).toBe(true);
    expect(job.location.raw).toBe('Remote worldwide');
  });

  it('uses defaults for office, tier and postedAt when values are missing', () => {
    const mapper = new PersonioJobMapper('Acme Inc', 'acme');
    const job = mapper.mapToNormalizedJob(sampleRaw({ office: undefined, createdAt: undefined }));
    expect(job.companyName).toBe('Acme Inc');
    expect(job.location).toEqual({ raw: '', isRemote: false });
    expect(job.postedAt).toBeDefined();
  });

  it('dedupes tags case-insensitively keeping the last value', () => {
    const mapper = new PersonioJobMapper('Acme Inc', 'acme');
    const job = mapper.mapToNormalizedJob(
      sampleRaw({
        department: 'Engineering',
        recruitingCategory: 'engineering',
        employmentType: 'engineering',
        seniority: 'Full-time',
        schedule: 'Full-Time',
      }),
    );
    expect(job.tags).toEqual(['engineering', 'Full-Time']);
  });

  it('leaves tags empty when no tag fields are present', () => {
    const mapper = new PersonioJobMapper('Acme Inc', 'acme');
    const job = mapper.mapToNormalizedJob(
      sampleRaw({
        department: undefined,
        recruitingCategory: undefined,
        employmentType: undefined,
        seniority: undefined,
        schedule: undefined,
      }),
    );
    expect(job.tags).toEqual([]);
  });

  it('throws when id, name or company name is missing', () => {
    const mapper = new PersonioJobMapper('Acme Inc', 'acme');
    expect(() => mapper.mapToNormalizedJob(sampleRaw({ id: '' }))).toThrow(
      'Cannot map job because "id" is missing',
    );
    expect(() => mapper.mapToNormalizedJob(sampleRaw({ name: '  ' }))).toThrow(
      'Cannot map job because "name" is missing',
    );
    const noCompany = new PersonioJobMapper('', 'acme');
    expect(() => noCompany.mapToNormalizedJob(sampleRaw())).toThrow(
      'Cannot map job because "companyName" is missing',
    );
  });

  it('maps many positions', () => {
    const mapper = new PersonioJobMapper('Acme Inc', 'acme');
    const jobs = mapper.mapMany([sampleRaw({ id: '1' }), sampleRaw({ id: '2' })], 'personio');
    expect(jobs).toHaveLength(2);
    expect(jobs.map((j) => j.id)).toEqual(['1', '2']);
  });
});

describe('PersonioJobProvider', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    backoffMocks.sleep.mockImplementation(async () => undefined);
    backoffMocks.calculateJitteredBackoff.mockReturnValue(0);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    backoffMocks.sleep.mockReset();
    backoffMocks.calculateJitteredBackoff.mockReset();
  });

  it('fetches jobs from the default account when none configured', async () => {
    fetchMock.mockResolvedValueOnce(
      createResponse(
        `<positions>${buildPosition({ id: '1', name: 'Role', office: 'Berlin' })}</positions>`,
      ),
    );
    const provider = new PersonioJobProvider();
    const jobs = await provider.fetchJobs({});
    expect(jobs).toHaveLength(1);
    expect(jobs[0].companyName).toBe('Personio Sample');
    expect(jobs[0].providerTier).toBe(ProviderTier.PUBLIC);
  });

  it('uses configured accounts and tier and applies filters', async () => {
    fetchMock.mockResolvedValueOnce(
      createResponse(
        `<positions>${buildPosition({ id: '1', name: 'React Dev', office: 'Remote' })}${buildPosition({ id: '2', name: 'Accountant', office: 'London' })}</positions>`,
      ),
    );
    const provider = new PersonioJobProvider({
      tier: ProviderTier.FREE_AUTH,
      accounts: [{ account: 'acme' }],
      timeoutMs: 200,
    });
    const jobs = await provider.fetchJobs({ query: 'react', isRemote: true });
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe('React Dev');
    expect(jobs[0].providerTier).toBe(ProviderTier.FREE_AUTH);
    expect(jobs[0].companyName).toBe('acme');
  });

  it('filters by company and location', async () => {
    fetchMock.mockResolvedValueOnce(
      createResponse(
        `<positions>${buildPosition({ id: '1', name: 'Role A', office: 'Berlin' })}</positions>`,
      ),
    );
    const provider = new PersonioJobProvider({
      accounts: [{ account: 'a', companyName: 'Xcorp' }],
    });
    const jobs = await provider.fetchJobs({ company: 'xcorp', location: 'berlin' });
    expect(jobs).toHaveLength(1);
  });

  it('filters out jobs that do not match', async () => {
    fetchMock.mockResolvedValueOnce(
      createResponse(
        `<positions>${buildPosition({ id: '1', name: 'Role A', office: 'Berlin' })}</positions>`,
      ),
    );
    const provider = new PersonioJobProvider();
    const jobs = await provider.fetchJobs({ company: 'nope', isRemote: true, minSalary: 999999 });
    expect(jobs).toHaveLength(0);
  });

  it('warns and continues when an account fetch fails', async () => {
    fetchMock.mockRejectedValue(new Error('down'));
    const provider = new PersonioJobProvider({
      accounts: [{ account: 'good', companyName: 'Good' }, { account: 'bad' }],
    });
    const jobs = await provider.fetchJobs({});
    expect(jobs).toEqual([]);
  });

  it('exposes healthCheck and getRateLimitStatus', async () => {
    const provider = new PersonioJobProvider();
    const health = await provider.healthCheck();
    expect(health.status).toBe(ProviderHealthStatus.HEALTHY);
    expect(provider.getRateLimitStatus().remaining).toBe(1000);
    expect(provider.isEnabled).toBe(true);
    expect(provider.name).toBe('personio');
  });
});
