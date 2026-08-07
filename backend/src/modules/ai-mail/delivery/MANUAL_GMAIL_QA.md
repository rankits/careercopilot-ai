# Phase 2A Manual Gmail QA Checklist

Manual only — do not add these checks to CI.

## Preconditions

1. Backend env (and Compose `environment:` if using Docker):
   - `GOOGLE_GMAIL_ENABLED=true` with valid OAuth client/secret/encryption/state keys
   - `GOOGLE_GMAIL_SEND_ENABLED=true`
   - `MAIL_SENDING_ENABLED=true`
   - Redirect URI for Connected Accounts: `http://localhost:3000/settings/connected-accounts/google/result`
2. Apply Prisma migration `20260807140000_init_mail_delivery`
3. Recreate backend container / restart after env changes
4. Google Cloud Console Authorized redirect URIs include the Connected Accounts callback

## Happy path

1. Sign in to Career Copilot
2. Settings → Connected Accounts → connect Google (must grant `gmail.send`)
3. AI Mail Composer → create/open draft → generate or write subject + body → Mark Ready
4. Confirm banner says manual Gmail send is enabled
5. Click **Send Email** → confirm From/To/Subject/Resume → **Confirm Send**
6. Expect success toast; draft stays `ready_to_send`
7. Verify message in Gmail **Sent** with resume attachment
8. Confirm API responses and server logs contain **no** access/refresh tokens, MIME, or full body dumps

## Negative / safety

1. With flags off (`MAIL_SENDING_ENABLED=false`): Send button hidden; `POST /send` returns `403 MAIL_SENDING_DISABLED`
2. Edit a ready draft (status → `edited`): Send disabled until re-mark-ready
3. Disconnect Google / revoke `gmail.send`: send fails with reconnect guidance linking to Connected Accounts
4. Replay same `idempotencyKey`: returns prior success without a second Gmail message
5. Do not blind-retry after an unknown/timeout outcome — check Gmail Sent first, then use resolve-status if needed

## Phase 2B history / follow-up

1. Apply migration `20260807153000_phase2b_delivery_history`
2. Set `AI_MAIL_RECIPIENT_HMAC_SECRET` (base64 ≥32 bytes) when `MAIL_SENDING_ENABLED=true`
3. Sent tab lists deliveries; unknown rows offer Confirm sent / not sent
4. Prepare Follow-up creates a new draft (still requires mark-ready → confirm send)
5. Daily send-limit chip reflects attempt counts

## Out of scope (Phase 3+)

Auto-send, inbox read, reply tracking, batch/schedule, Microsoft, admin dashboards beyond limits/metrics logs.
