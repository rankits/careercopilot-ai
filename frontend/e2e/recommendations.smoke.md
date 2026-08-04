# Recommendations E2E smoke (JR-QA-004)

Playwright covers job-feed UI smoke; recommendation generate requires authenticated backend + embeddings.

Run API smoke when backend is up:

```bash
cd backend
REC_E2E_TOKEN="<user-jwt>" node scripts/recommendations-smoke.mjs
```

Optional base URL override: `REC_E2E_BASE_URL=http://127.0.0.1:3000/api/v1`

Steps exercised: readiness → list → generate (if profile ready) → dismiss feedback.
