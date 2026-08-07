# Phase 2B Final Report — Delivery History + Follow-up Prep

## Status: complete

Phase 2B adds delivery history, unknown-status resolution, duplicate-send assessment, follow-up draft preparation (still manual send), send-limit visibility, and Compose | Sent UI.

## Shipped

### Schema / config

- `MailDeliveryStatus`: `pending | sending | sent | failed | unknown | cancelled` (`queued`→`pending`, `ambiguous`→`unknown`)
- Snapshots on send: `subjectSnapshot`, `companyNameSnapshot`, `roleTitleSnapshot`
- `recipientHash` (HMAC-SHA256), `userResolution` / `userResolvedAt`
- `AiMailDraft.followUpToDeliveryId` → `MailDelivery`
- Migration: `backend/prisma/migrations/20260807153000_phase2b_delivery_history`
- Env: `AI_MAIL_RECIPIENT_HMAC_SECRET`, `AI_MAIL_MIN_FOLLOW_UP_INTERVAL_HOURS` (72), `MAIL_SENDS_PER_USER_PER_DAY` (30)

### APIs

- `GET /ai-mail/deliveries`, `GET /ai-mail/deliveries/:id`, `GET /ai-mail/drafts/:id/deliveries`
- `POST /ai-mail/deliveries/:id/resolve-status` (unknown only; never mutates provider `status`)
- `POST /ai-mail/deliveries/:id/prepare-follow-up` (sent or unknown+confirmed_sent)
- `GET /ai-mail/send-limits`
- Send preview includes `duplicateAssessment` (`hard_block` | `warning` | `info` | `none`)

### Generation

- Drafts with `followUpToDeliveryId` use `generate_follow_up` automatically
- Prompt policy forbids read/open/reply/ignore claims
- Optional `followUpStyle`: concise | polite | value_add | check_in

### Frontend (`/ai-mail`)

- Tabs: Compose | Sent (`?tab=sent`)
- Sent list, detail drawer, unknown resolve actions, follow-up dialog
- Compose: “Sent N times / Last sent…”, daily limits chip, duplicate warnings in send modal

## Verification (this session)

| Check                                   | Result                                                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `npx prisma validate`                   | pass                                                                                                        |
| `npx vitest run src/modules/ai-mail`    | 28 files / 128 tests pass                                                                                   |
| Frontend `AiMailPage` + `ai-mail` tests | 27 tests pass                                                                                               |
| Backend eslint `src/modules/ai-mail`    | relative-import fixes applied; re-run in verification                                                       |
| Frontend eslint Ai Mail                 | import-order / assertion fixes applied                                                                      |
| Backend `tsc` (ai-mail paths)           | clean after Unchecked create + smoke `current` fix; remaining `tsc` exit≠0 is outside `src/modules/ai-mail` |

## Boundary confirmations (unchanged)

- No Gmail read scopes / inbox access
- No reply or open tracking
- No auto-send, schedulers, or background send workers
- Follow-up still requires: prepare → generate → mark-ready → confirmation modal → send

## Ops notes

1. Apply migration `20260807153000_phase2b_delivery_history`
2. When enabling send, set `AI_MAIL_RECIPIENT_HMAC_SECRET` (base64 ≥32 bytes)
3. Manual QA checklist: `backend/src/modules/ai-mail/delivery/MANUAL_GMAIL_QA.md`
