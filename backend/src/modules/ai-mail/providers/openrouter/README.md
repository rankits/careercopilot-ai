# OpenRouter AI Mail provider (Phase 1E)

Configuration-driven `MailGenerationProvider` adapter. Does not rebuild context, decide truthfulness, or mutate drafts.

## Selection

```bash
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=openrouter/free   # example only — not a code default
OPENROUTER_STRUCTURED_OUTPUT_ENABLED=true
```

`AI_MAIL_MAX_RETRIES=N` means at most **N retry attempts after the first try** across the whole provider call (all models). Total attempts ≤ `N + 1`.

## Manual smoke (not CI)

```bash
npm run ai-mail:openrouter:smoke
```

Prints provider / models / duration / tokens / validation only. Set `AI_MAIL_SMOKE_PRINT_OUTPUT=true` to include a short body preview.
