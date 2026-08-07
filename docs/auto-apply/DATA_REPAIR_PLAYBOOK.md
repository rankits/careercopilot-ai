# Assisted Apply — Data repair playbook (AA-093)

Operator-only procedures for bad `JobApplication` statuses. Prefer dry-run. Never raw SQL that bypasses the state machine.

## Discoverability

`GET /api/v1/auto-apply/admin/stuck-submissions` includes:

```json
"playbooks": {
  "dataRepair": "docs/auto-apply/DATA_REPAIR_PLAYBOOK.md",
  "rolloutRollback": "docs/auto-apply/ROLLOUT_AND_ROLLBACK.md"
}
```

Requires admin + `applications.autoapply.diagnostics.read.any`.

---

## Category A — `SUBMITTING` limbo

### Symptoms

- Row status `SUBMITTING` older than the reclaim threshold.
- Admin diagnostics lists it under stuck submissions.

### Decision

Use **AA-007** reclaim when the row is genuinely stuck (worker crash / abandoned publish). Investigate first if volume is suddenly high (possible systemic outage).

### Procedure

1. `GET /api/v1/auto-apply/admin/stuck-submissions?queueStalledAfterMinutes=30`
2. Review listed ids.
3. `POST /api/v1/auto-apply/admin/reclaim-stuck` with body `{ "submittingOlderThanMinutes": 30 }`
4. Confirm rows move to `SUBMISSION_FAILED` and `SUBMISSION_RECLAIMED` audit events appear.
5. If a row remains stuck, open an incident — do not force-update status by hand.

---

## Category B — Legacy `APPROVED` / `QUEUED`

### Symptoms

- Candidates see **Needs attention** (`LEGACY_ATTENTION`) for queue-era rows.
- Phase 1 UI no longer offers Approve / Continue to apply.

### Decision

Bulk-repair to `WITHDRAWN` after dry-run review when candidates cannot self-serve at scale. Candidates can also Abandon from the list when Phase 1 UI is on.

### Dry-run (required first)

```bash
cd backend
npm run auto-apply:repair-legacy-status -- --dry-run
```

Review JSON: `eligible` rows must be only `APPROVED` / `QUEUED` → `WITHDRAWN`.

### Execute (explicit confirm)

```bash
npm run auto-apply:repair-legacy-status -- --execute --confirm=REPAIR_LEGACY_STATUS
```

- Uses CAS `updateMany` with expected prior status (skips already-repaired → idempotent).
- Emits audit `LEGACY_STATUS_REPAIRED` with `metadata.actorType: "ADMIN"`.
- Does **not** bypass `state-machine.util.ts` (eligibility checked via `isValidTransition`).

### Verify

1. Re-run dry-run → eligible count near 0 for those ids.
2. Confirm audit events for repaired ids.
3. Spot-check FE list shows **Stopped** / abandoned labeling.

---

## Safety rules

| Rule | Detail |
|------|--------|
| Dry-run first | Execute refuses without `--confirm=REPAIR_LEGACY_STATUS` |
| No unguarded UPDATE | Script plans via state-machine helpers |
| Admin only | Reclaim endpoint is ADMIN + diagnostics write |
| No candidate content in logs | Script logs ids/status only |

---

## Rollback of a mistaken repair

There is no automatic un-repair. If a row was wrongly withdrawn, use product reopen (Assisted Apply CTA → `WITHDRAWN` → `DISCOVERED`) or a follow-up investigated fix — do not invent a reverse bulk script without a new ticket.
