# Recommendation Rerank Fallback Contract

Ticket: `JRE-RANK-002`

## Feature Flag

Reranking is disabled by default.

- `ENABLE_RECOMMENDATION_RERANK=true` enables the production adapter.
- `RECOMMENDATION_RERANK_MODEL` is required for the adapter to call a provider.
- `RECOMMENDATION_RERANK_API_KEY` or `OPENAI_API_KEY` supplies the bearer token.
- `RECOMMENDATION_RERANK_BASE_URL` defaults to `OPENAI_BASE_URL` or `https://api.openai.com/v1`.
- `RECOMMENDATION_RERANK_TOP_N` defaults to `10`.
- `RECOMMENDATION_RERANK_TIMEOUT_MS` defaults to `2000`.

If the flag is off or required provider settings are absent, generation uses the
deterministic ranking path only.

## Ranking Flow

1. Retrieve candidates.
2. Score every eligible candidate deterministically.
3. Sort by deterministic score, match quality, then job id.
4. Optionally rerank only the configured top-N candidates.
5. Preserve deterministic scores and categories.
6. Persist the final order as recommendation rank.

The repository still sorts direct `createMany` calls by deterministic ranking
unless generation explicitly passes `preserveOrder`.

## Safe Fallback

Reranker errors, invalid responses, provider timeouts, duplicate ids, omitted ids,
and invented ids do not fail generation. The service sanitizes rerank output and
falls back to deterministic ordering when the adapter throws.

## Prompt Safety

The OpenAI-compatible adapter sends a compact JSON payload with candidate intent
and job listing fields only. It omits candidate `userId`, source ids, and raw
`sourceText`, treats job fields as untrusted data, and accepts only provider
output containing known job ids.

## Observability

`recommendation.rerank` logs:

- success/failure
- fallback
- candidate count
- latency

The metrics snapshot exposes `rerankSuccessCount`, `rerankFailureCount`,
`rerankFallbackCount`, and `rerankAverageLatencyMs`.

## Verification

- Adapter tests cover disabled mode, top-N rerank, omitted ids, invented ids,
  and prompt minimization.
- Generation tests cover persisted rerank order and deterministic fallback when
  reranking fails.
- Existing ranking tests continue to cover deterministic repository behavior.
