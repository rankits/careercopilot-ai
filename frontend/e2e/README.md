# Frontend E2E (Playwright)

## Run

```bash
npm run test:e2e
```

Starts Vite on port `4173` (override with `E2E_PORT`) and runs Chromium specs under `e2e/`.

CI: `.github/workflows/frontend-pr.yml` job `e2e-smoke` runs the full suite (required by the quality gate).

## Specs

### Job feed smoke — `job-feed.smoke.spec.ts`

1. Seeds an authenticated + onboarded session via `localStorage`
2. Mocks `GET /api/v1/jobs`
3. Asserts feed render, Remote filter, and pagination

### Resume builder flow — `resume-builder.flow.spec.ts`

End-to-end happy path with mocked APIs (no live LLM / DB):

1. **Upload** a `.txt` resume
2. **Analyze** against target role + JD (poll completes)
3. **Apply** a suggestion on Optimize
4. **Export** Word document via `/resume-analysis/:id/export`

Live-backend smoke can be added later by dropping the route mocks and pointing `VITE_API_BASE_URL` at a seeded environment.
