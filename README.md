# CareerCopilot React Boilerplate

Production-ready React + TypeScript starter with a scalable feature-based structure.

## Included

- Vite, React, TypeScript and `@/*` path alias
- Public and protected routes
- Authentication feature with Redux Toolkit
- Axios client with token interceptor
- React Hook Form + Zod validation
- Constants, interfaces, services, hooks, utils and layouts
- ESLint, Prettier, Husky, lint-staged and Commitlint
- Dependency placeholder for `@careercopilot/ui-library`

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

If `@careercopilot/ui-library` is private, authenticate against the registry first. If the package is not published yet, remove it temporarily from `package.json` or replace it with a local tarball/workspace dependency.

## Commit convention

```bash
git commit -m "feat(auth): add login flow"
git commit -m "fix(router): redirect unauthenticated users"
```

Invalid commit messages are rejected by Commitlint. Staged files are linted and formatted before every commit.

## Quality commands

```bash
npm run lint
npm run typecheck
npm run format:check
npm run build
npm run validate
```

## UI library usage

After confirming exported component names, import them like:

```tsx
import { Button, Input } from '@careercopilot/ui-library';
```

Then replace the starter native controls in feature components.

## API and workers

The backend exposes a REST API on `http://localhost:5001` and uses background workers for long-running tasks. Each worker runs independently:

| Worker | Command | Purpose |
|--------|---------|---------|
| Email | `npm run worker:email` | Sends transactional emails (OTP, welcome, security alerts) via SMTP |
| Resume analysis | `npm run worker:resume-analysis` | Runs AI resume analysis jobs (Gemini/Groq/OpenRouter) with retry fallbacks |
| Job embeddings | `npm run worker:job-embeddings` | Creates vector embeddings for jobs (pgvector + AI providers) for semantic recommendations |
| Application submission | `npm run worker:application-submission` | Processes auto-apply submissions with reliability guarantees (locking, validation, retries) |
| Outbox relay | `npm run worker:outbox` | Relays outbox events to RabbitMQ with configurable batch size and retry backoff |

Resume analysis durability (outbox → RabbitMQ → worker) is enabled in compose via `RESUME_ANALYSIS_USE_OUTBOX=true`. Without it, analysis runs inline in the API process (`setImmediate`) so local `npm run dev` still works.
