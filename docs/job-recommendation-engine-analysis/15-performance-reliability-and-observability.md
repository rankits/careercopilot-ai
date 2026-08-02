# 15 — Performance, Reliability, and Observability

**Branch:** `feat/job-recommendation-engine`  
**Code is source of truth** for CURRENT. TARGET is the full multi-source Job Recommendation Engine specification.


## CURRENT

| Topic | Behavior |
|---|---|
| Generate mode | Sync HTTP (JR-PROD-002) |
| Timeout | ~55s → 504 |
| Rate limit | 10 / 15 min |
| Query embed cache | Redis 5 min |
| Metrics | In-process counters/logs |
| Worker | Job embeddings async; recommendation worker removed |
| Degradation | Coverage blocker if ratio < 0.25 |

## TARGET budgets (formalized in JRE-PERF-001)

- Warm PROFILE generate p95 under 2,500 ms in staging with candidate embedding cache warm  
- Warm non-PROFILE generate p95 under 3,500 ms in staging with candidate embedding cache warm  
- List latestOnly p95 interactive  
- Embedding reuse hit rate monitored  
- Vector DB down → safe FAILED/503, no fake jobs  

## Gaps

| ID | Gap |
|---|---|
| JRE-PERF-001/002/003 | Budgets, list indexes |
| JRE-OBS-001/002 | Export metrics, alerts, coverage UX |
| JRE-REL-001 | Partial failure matrix |
| JRE-BE-003 | Timeout/failure semantics |
| JRE-EMB-002/003 | Reuse to cut cost/latency |
