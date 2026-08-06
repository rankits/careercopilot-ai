import { expect, test, type Page } from '@playwright/test';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'careercopilot_access_token',
  PROFILE_COMPLETE: 'careercopilot_profile_complete',
  USER: 'careercopilot_user',
} as const;

function jobEnvelope(page: number, remoteOnly = false) {
  const items = [
    {
      id: 'job-ms',
      title: 'Senior Frontend Engineer',
      company: { slug: 'microsoft', name: 'Microsoft', logoUrl: null, verified: true },
      location: { formatted: 'Remote', remoteType: 'REMOTE' },
      employmentType: 'FULL_TIME',
      salary: { minimum: 18, maximum: 28, currency: 'INR' },
      skills: ['React', 'TypeScript'],
      publishedAt: '2026-07-30T00:00:00.000Z',
      applyUrl: 'https://careers.microsoft.com/1',
    },
    {
      id: 'job-google',
      title: 'Frontend Engineer',
      company: { slug: 'google', name: 'Google', logoUrl: null, verified: true },
      location: { formatted: 'On-site', remoteType: 'ONSITE' },
      employmentType: 'FULL_TIME',
      salary: { minimum: 20, maximum: 30, currency: 'INR' },
      skills: ['React'],
      publishedAt: '2026-07-29T00:00:00.000Z',
      applyUrl: null,
    },
  ].filter((job) => (remoteOnly ? job.location.remoteType === 'REMOTE' : true));

  return {
    status: 'success',
    message: 'Jobs retrieved successfully',
    data: {
      items: page === 1 ? items : items.slice(0, 1),
      pagination: {
        page,
        limit: 20,
        totalItems: remoteOnly ? 1 : 2,
        totalPages: remoteOnly ? 1 : 2,
        hasNextPage: !remoteOnly && page === 1,
        hasPreviousPage: page > 1,
      },
      appliedFilters: {},
    },
  };
}

async function seedOnboardedSession(page: Page) {
  await page.addInitScript(
    ({ tokenKey, profileKey, userKey }) => {
      // Matches `storage.set` JSON encoding used by the auth slice.
      localStorage.setItem(tokenKey, JSON.stringify('e2e-access-token'));
      localStorage.setItem(profileKey, JSON.stringify(true));
      localStorage.setItem(
        userKey,
        JSON.stringify({
          email: 'ada@example.com',
          id: 'user-1',
          name: 'Ada',
          role: 'user',
        }),
      );
    },
    {
      tokenKey: STORAGE_KEYS.ACCESS_TOKEN,
      profileKey: STORAGE_KEYS.PROFILE_COMPLETE,
      userKey: STORAGE_KEYS.USER,
    },
  );
}

test.describe('Job feed happy path', () => {
  test('authenticated onboarded user can load filter and paginate jobs from GET /jobs', async ({
    page,
  }) => {
    const jobRequests: string[] = [];

    await seedOnboardedSession(page);

    await page.route('**/api/v1/jobs**', async (route) => {
      const url = new URL(route.request().url());
      // Detail requests include an id path segment after /jobs/
      if (/\/api\/v1\/jobs\/[^/?]+/.test(url.pathname)) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'error', message: 'Job not found' }),
        });
        return;
      }

      jobRequests.push(url.search);
      const pageNum = Number(url.searchParams.get('page') || '1');
      const remoteOnly = url.searchParams.get('remoteTypes') === 'REMOTE';

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(jobEnvelope(pageNum, remoteOnly)),
      });
    });

    await page.goto('/jobs-feed');

    await expect(page.getByRole('heading', { name: /job feed/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/microsoft/i).first()).toBeVisible();
    await expect(page.getByText(/2 jobs found/i)).toBeVisible();
    expect(
      jobRequests.some(
        (q) =>
          q.includes('sortBy=newest') || q.includes('page=1') || q === '' || q.includes('limit=20'),
      ),
    ).toBeTruthy();

    await page.getByRole('button', { name: /^remote$/i }).click();
    await expect(page.getByText(/1 job found/i)).toBeVisible();
    await expect.poll(() => jobRequests.some((q) => q.includes('remoteTypes=REMOTE'))).toBeTruthy();

    // Reset work mode via All Jobs so pagination smoke uses the multi-page fixture.
    await page.getByRole('button', { name: /^all jobs$/i }).click();
    await expect(page.getByText(/2 jobs found/i)).toBeVisible();

    await expect.poll(() => jobRequests.some((q) => q.includes('page=2'))).toBeTruthy();
  });
});
