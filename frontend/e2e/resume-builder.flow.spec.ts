import { expect, test, type Page } from '@playwright/test';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'careercopilot_access_token',
  PROFILE_COMPLETE: 'careercopilot_profile_complete',
  USER: 'careercopilot_user',
} as const;

const RESUME_ID = 'resume-e2e-1';
const ANALYSIS_ID = 42;

const RESUME_CONTENT = `Ada Lovelace
Senior Frontend Developer

SUMMARY
Frontend engineer with React and JavaScript experience building ATS-friendly career tools.

EXPERIENCE
CareerCopilot — Senior Frontend Engineer
Jan 2022 – Present
- Built resume builder UI with React and JavaScript
- Improved ATS keyword coverage for job applications

SKILLS
React, JavaScript, HTML, CSS, Vite

EDUCATION
B.S. Computer Science
`;

const suggestion = {
  id: 11,
  title: 'Add TypeScript to skills',
  category: 'skills',
  originalText: 'React, JavaScript',
  suggestedText: 'React, TypeScript, JavaScript',
  impact: 'HIGH' as const,
  status: 'PENDING' as const,
  reason: 'JD requires TypeScript',
};

function ok<T>(data: T, message = 'ok') {
  return {
    status: 'success',
    message,
    data,
  };
}

function completedAnalysis(overrides: Record<string, unknown> = {}) {
  return {
    id: ANALYSIS_ID,
    resumeId: RESUME_ID,
    targetRole: 'Senior Frontend Developer',
    experienceLevel: 'senior',
    jobDescription: 'We need a Senior Frontend Developer with React and TypeScript.',
    atsScore: 72,
    baselineAtsScore: 68,
    keywordMatch: 70,
    skillMatch: 75,
    contentQuality: 70,
    readability: 72,
    formattingScore: 80,
    strengths: ['Clear summary', 'Relevant experience'],
    weaknesses: ['Could add TypeScript explicitly'],
    editedContent: RESUME_CONTENT,
    currentStep: 3,
    status: 'COMPLETED',
    keywords: [
      { id: 1, term: 'React', status: 'MATCHED', importance: 'HIGH' },
      { id: 2, term: 'TypeScript', status: 'MISSING', importance: 'HIGH' },
    ],
    suggestions: [suggestion],
    skillAnalysis: {
      matchedSkills: ['React', 'JavaScript'],
      missingSkills: ['TypeScript'],
      transferableSkills: [],
      recommendedSkills: ['TypeScript'],
    },
    sectionScores: {
      summary: 70,
      experience: 72,
      skills: 65,
      education: 60,
      projects: 40,
      achievements: 30,
    },
    atsIssues: [],
    invalidTarget: false,
    ...overrides,
  };
}

async function seedOnboardedSession(page: Page) {
  await page.addInitScript(
    ({ tokenKey, profileKey, userKey }) => {
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

async function mockResumeBuilderApis(page: Page) {
  let analysisPolls = 0;
  let suggestionStatus: 'PENDING' | 'APPLIED' = 'PENDING';
  let exportCalls = 0;
  let analyzeStarted = false;

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname.replace(/\/$/, '');

    const json = async (status: number, body: unknown) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });

    try {
      if (method === 'GET' && path.endsWith('/resumes')) {
        return json(200, ok([]));
      }

      if (method === 'POST' && path.endsWith('/resumes/upload')) {
        return json(
          201,
          ok({
            id: RESUME_ID,
            originalName: 'ada-resume.txt',
            fileName: 'ada-resume.txt',
            status: 'UPLOADED',
            createdAt: '2026-08-01T00:00:00.000Z',
            sizeBytes: 512,
          }),
        );
      }

      if (method === 'GET' && path.includes(`/resumes/${RESUME_ID}/parsed-data`)) {
        return json(200, ok({ extractedData: { skills: ['React', 'TypeScript'] } }));
      }

      if (method === 'GET' && path.includes(`/resume-analysis/${RESUME_ID}/analysis`)) {
        analysisPolls += 1;
        if (!analyzeStarted) {
          return json(200, ok(null, 'No analysis yet'));
        }
        // Deterministic completed payload once analyze has been posted (no ANALYZING race).
        return json(
          200,
          ok(
            completedAnalysis({
              suggestions: [{ ...suggestion, status: suggestionStatus }],
            }),
          ),
        );
      }

      if (method === 'POST' && path.endsWith(`/resume-analysis/${RESUME_ID}/analyze`)) {
        analyzeStarted = true;
        analysisPolls = 0;
        return json(202, ok({ analysisId: ANALYSIS_ID, status: 'ANALYZING' }, 'Analysis started'));
      }

      if (method === 'GET' && path.endsWith(`/resume-analysis/${RESUME_ID}/keywords`)) {
        return json(
          200,
          ok({
            missing: [{ id: 2, term: 'TypeScript', status: 'MISSING', importance: 'HIGH' }],
            matched: [{ id: 1, term: 'React', status: 'MATCHED', importance: 'HIGH' }],
            partial: [],
          }),
        );
      }

      if (method === 'GET' && path.endsWith(`/resume-analysis/${RESUME_ID}/suggestions`)) {
        return json(200, ok([{ ...suggestion, status: suggestionStatus }]));
      }

      if (
        method === 'POST' &&
        path.endsWith(`/resume-analysis/${RESUME_ID}/suggestions/${suggestion.id}/apply`)
      ) {
        suggestionStatus = 'APPLIED';
        return json(200, ok({ ...suggestion, status: 'APPLIED' }, 'Suggestion applied'));
      }

      if (method === 'PATCH' && path.endsWith(`/resume-analysis/${RESUME_ID}/content`)) {
        return json(200, ok({ ok: true }, 'Content updated'));
      }

      if (method === 'PATCH' && path.endsWith(`/resume-analysis/${RESUME_ID}/step`)) {
        return json(200, ok({ currentStep: 5 }, 'Step updated'));
      }

      if (method === 'POST' && path.endsWith(`/resume-analysis/${RESUME_ID}/recheck`)) {
        return json(
          200,
          ok({
            atsScore: 84,
            previousAtsScore: 72,
            improvement: 12,
            grade: 'Very Good',
            keywordMatch: 80,
            skillMatch: 85,
            contentQuality: 78,
            readability: 80,
            formattingScore: 82,
            sectionScores: {
              summary: 75,
              experience: 80,
              skills: 85,
              education: 60,
              projects: 50,
              achievements: 40,
            },
            skillAnalysis: {
              matchedSkills: ['React', 'TypeScript', 'JavaScript'],
              missingSkills: [],
              transferableSkills: [],
              recommendedSkills: [],
            },
          }),
        );
      }

      if (method === 'GET' && path.endsWith(`/resume-analysis/${RESUME_ID}/versions`)) {
        return json(200, ok([]));
      }

      if (method === 'POST' && path.endsWith(`/resume-analysis/${RESUME_ID}/versions`)) {
        return json(
          201,
          ok({
            id: 1,
            label: 'Senior Frontend Developer — saved',
            content: RESUME_CONTENT,
            atsScore: 84,
            createdAt: '2026-08-01T00:00:00.000Z',
          }),
        );
      }

      if (method === 'GET' && path.includes(`/resume-analysis/${RESUME_ID}/export`)) {
        exportCalls += 1;
        const format = url.searchParams.get('format') ?? 'txt';
        return json(
          200,
          ok({
            content: Buffer.from(RESUME_CONTENT).toString('base64'),
            mimeType:
              format === 'docx'
                ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                : 'application/pdf',
            fileName: `ada-resume_optimized.${format}`,
          }),
        );
      }

      if (method === 'GET' && path.endsWith('/resume-analysis/saved-versions')) {
        return json(200, ok([]));
      }

      // Auth / profile / jobs probes from layout — never hang the SPA.
      return json(200, ok(null));
    } catch {
      return json(500, { status: 'error', message: 'Mock handler failure' });
    }
  });

  return {
    getExportCalls: () => exportCalls,
    getSuggestionStatus: () => suggestionStatus,
  };
}

test.describe('Resume builder upload → analyze → apply → export', () => {
  test('authenticated user can complete the mocked optimize flow', async ({ page }) => {
    test.setTimeout(90_000);
    await seedOnboardedSession(page);
    const mocks = await mockResumeBuilderApis(page);

    await page.goto('/resume-builder', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Upload Your Resume')).toBeVisible({ timeout: 30_000 });

    // Upload (txt is accepted)
    await page.locator('input[type="file"]').setInputFiles({
      name: 'ada-resume.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(RESUME_CONTENT),
    });

    await expect(page.getByText(/Define Your Target Role/i)).toBeVisible({ timeout: 15_000 });

    await page.getByPlaceholder('e.g. Senior Frontend Developer').fill('Senior Frontend Developer');
    await page
      .getByPlaceholder(/Paste the full job description/i)
      .fill(
        'We are hiring a Senior Frontend Developer with strong React and TypeScript experience building product UIs.',
      );

    await page.getByRole('button', { name: /^Next$/i }).click();

    // Analysis completes via mocked polls
    await expect(page.getByText(/Good Match/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('72').first()).toBeVisible();

    // Prefer in-dashboard CTA (same as Optimize path) over header Next.
    const optimizeCta = page.getByRole('button', { name: /Optimize resume/i });
    await expect(optimizeCta).toBeVisible({ timeout: 10_000 });
    await optimizeCta.click();

    // Optimize step
    await expect(page.getByRole('heading', { name: /Optimize Your Resume/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: /Apply next fix/i })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: /Apply next fix/i }).click();
    await expect.poll(() => mocks.getSuggestionStatus()).toBe('APPLIED');

    await page.getByRole('button', { name: /Continue to Export/i }).click();

    await expect(page.getByText(/Export Your Optimized Resume/i)).toBeVisible({ timeout: 15_000 });

    // Word export hits API; PDF may be client-side canvas
    await page.getByRole('button', { name: /Download Word Document/i }).click();
    await expect.poll(() => mocks.getExportCalls()).toBeGreaterThan(0);
  });
});
