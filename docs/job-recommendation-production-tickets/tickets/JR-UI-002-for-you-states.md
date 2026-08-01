# JR-UI-002 — For You state coverage

Implemented in `ForYouPage.tsx`:

- **Loading** — spinner with `aria-label`
- **List error** — alert role + Retry button
- **Profile incomplete** — backend `PROFILE_INCOMPLETE` blocker + Redux fallback
- **Profile missing** — `PROFILE_NOT_FOUND` blocker
- **Empty (ready)** — generate CTA without auto-generate on load
- **Stale** — `RECOMMENDATIONS_STALE` banner when profile updated after last run
- **Embedding pending** — `EMBEDDING_COVERAGE_LOW` warning banner
- **Generate error** — inline alert on failed refresh/generate
- **Readiness fetch warning** — non-blocking alert when `/status` fails

Refresh uses explicit **Refresh matches** button; list load never triggers generation.
