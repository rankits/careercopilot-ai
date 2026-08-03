# Frontend E2E (Playwright)

Introduced for **JOB-QA-004** — job listing smoke after login/onboarding.

## Run

```bash
npm run test:e2e
```

Starts Vite on port `4173` (override with `E2E_PORT`) and runs Chromium specs under `e2e/`.

## Job feed smoke

`job-feed.smoke.spec.ts`:

1. Seeds an authenticated + onboarded session via `localStorage` (same keys as production auth slice)
2. Mocks `GET /api/v1/jobs` so CI does not require a live API
3. Asserts feed render, Remote filter request, and pagination (`page=2`)

Live-backend smoke can be added later by dropping the route mock and pointing `VITE_API_BASE_URL` at a seeded environment.
