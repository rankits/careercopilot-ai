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
