# Rollout and Rollback

## Feature flags

| Flag | Purpose | Default |
|------|---------|---------|
| `ASSISTED_APPLY_PHASE1_UI` / `VITE_ASSISTED_APPLY_PHASE1_UI` | Hide queue/approve/retry UI | `true` (hide unsafe) |
| `ASSISTED_APPLY_WORKSPACE` / `VITE_ASSISTED_APPLY_WORKSPACE` | Enable `/assisted-apply/:id` flow | env kill switch; cohort via percent |
| `ASSISTED_APPLY_DIRECT_HANDOFF` | Use `POST .../handoff` instead of queue | `true` dogfood; set `false` to kill |
| `ASSISTED_APPLY_WORKSPACE_ROLLOUT_PERCENT` | 0–100 cohort for workspace (AA-092) | `100` |
| `ASSISTED_APPLY_HANDOFF_ROLLOUT_PERCENT` | 0–100 cohort for handoff (AA-092) | `100` |
| `ASSISTED_APPLY_ROLLOUT_ALLOWLIST` | Comma-separated user ids always included | empty |
| `ENABLE_AUTO_APPLY` | Existing kill switch for readiness | keep |

Per-user evaluation: `GET /api/v1/auto-apply/rollout-flags` (auth required).

## Staged rollout path (AA-092)

| Stage | Config | Go / no-go |
|------|--------|------------|
| 0 Internal | `*_ROLLOUT_PERCENT=0` + allowlist = dogfood user ids | Journey works; dashboards receive events; canary green |
| 1 Canary 5% | `*_ROLLOUT_PERCENT=5` (keep allowlist) | Error rate stable; `handoff_blocked` not spiking; zero queue correlation |
| 2 25% | percent=25 | Same signals hold ≥ 24h |
| 3 100% | percent=100 | Release gate AA-090/091 green |

**Frontend Vite flags** remain global kill switches for workspace/handoff UI. Prefer keeping `VITE_ASSISTED_APPLY_WORKSPACE=true` / handoff on in builds once Stage 0 starts; use **backend percent/allowlist** for cohorting.

## Monitoring queries / signals

Use AA-083 analytics + `AutoApplyAuditEvent` (no PII in analytics payloads).

| Signal | Source | Healthy |
|--------|--------|---------|
| `handoff_opened` volume | Audit `HANDOFF_OPENED` / analytics | Rising with traffic |
| `handoff_blocked` rate | Analytics `handoff_blocked` + 409s | Not suddenly elevated |
| `mark_applied` rate | Audit `MARKED_APPLIED` | Correlates with opened |
| `application_abandoned` + reason | Audit `SUBMISSION_WITHDRAWN` metadata.reasonCode | Reason codes only |
| Endpoint 5xx | API logs / APM on `/handoff`, `/mark-applied`, `/abandon` | Near zero |
| **Zero RabbitMQ canary** | `npm run auto-apply:handoff-queue-canary` + queue metrics | **Zero** publishes correlated with handoff |

### Suggested SQL (staging / read replica)

```sql
-- Handoff opened last 24h
SELECT date_trunc('hour', created_at) AS hour, count(*)
FROM auto_apply_audit_events
WHERE event_type = 'HANDOFF_OPENED' AND created_at > now() - interval '24 hours'
GROUP BY 1 ORDER BY 1;

-- Stuck SUBMITTING count
SELECT count(*) FROM job_applications WHERE status = 'SUBMITTING';
```

## Rollback runbook (operator)

1. **Immediate kill — handoff:** set `ASSISTED_APPLY_DIRECT_HANDOFF=false` (and redeploy/restart). Handoff returns `503 HANDOFF_DISABLED`. Queue must stay off — do **not** re-enable Approve/Queue.
2. **Immediate kill — workspace:** set `ASSISTED_APPLY_WORKSPACE_ROLLOUT_PERCENT=0` and clear allowlist, **or** set `VITE_ASSISTED_APPLY_WORKSPACE=false` and redeploy FE. Users fall back to Application Setup / Job Details Apply Now.
3. **Keep** `ASSISTED_APPLY_PHASE1_UI` hiding queue buttons.
4. Verify canary still reports no handoff→queue correlation after kill.
5. Announce status; file follow-ups against owning tickets (not ad-hoc re-enable of automation).

### Rollback drill checklist (staging)

- [ ] Flags on → complete one handoff + mark-applied
- [ ] Run `npm run auto-apply:handoff-queue-canary` → ok
- [ ] Set handoff flag false → handoff disabled gracefully
- [ ] Set workspace percent 0 → workspace cohort empty via `/rollout-flags`
- [ ] Confirm no Approve/Queue UI reappears

## Canary command

```bash
cd backend
npm run auto-apply:handoff-queue-canary
```

## Data repair

See [DATA_REPAIR_PLAYBOOK.md](./DATA_REPAIR_PLAYBOOK.md) (AA-093). Linked from admin stuck-submissions `playbooks`.
