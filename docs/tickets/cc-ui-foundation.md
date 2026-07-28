# CC-UI-FOUNDATION: Build CareerCopilot React Boilerplate And UI Foundation

## Status

Done

## Goal

Create a production-ready CareerCopilot frontend foundation with routing, auth scaffolding, quality tooling, local design tokens, and TDD-backed atom components.

## Main Scope

Build the base React + TypeScript boilerplate and introduce the first UI system layer without Storybook. The UI layer should use Material UI internally, follow the CareerCopilot local token system, and keep components organized with atomic design folders.

## Subtasks

### 1. Scaffold React Boilerplate Tooling

- Set up Vite, React, and TypeScript.
- Configure path aliases for `@/*`, `@components/*`, `@hooks/*`, `@styles/*`, and related app folders.
- Add ESLint, Prettier, Husky, lint-staged, and Commitlint.
- Add quality scripts for linting, formatting, type checking, build, and validation.

### 2. Add Core App Foundation

- Add app entry and root app shell.
- Add global styles.
- Add Redux store setup.
- Add typed Redux hooks.
- Add storage utility helpers.
- Add environment config.

### 3. Add Auth Foundation

- Add auth slice with initial auth state.
- Add auth service structure.
- Add auth-related TypeScript types.
- Add token storage constants.
- Add Axios HTTP client with token handling.

### 4. Add Routing And Pages

- Add route constants.
- Add app router.
- Add layout with sidebar shell.
- Add starter pages for home, profile, and not-found states.

### 5. Add TDD Test Coverage For Atom Components

- Add Vitest config.
- Add React Testing Library and jest-dom setup.
- Add Button tests before implementation.
- Add Input tests before implementation.
- Cover render behavior, accessibility, click behavior, loading state, variants, helper text, error state, and adornments.

### 6. Implement Local Token-Driven UI Components

- Add local CareerCopilot token system in `src/tokens`.
- Add local Material UI theme in `src/theme`.
- Wrap the app with local MUI `ThemeProvider`.
- Add atomic design folders:
  - `src/components/atoms`
  - `src/components/molecules`
  - `src/components/organisms`
- Add token-driven `Button` atom using Material UI internally.
- Add token-driven `Input` atom using Material UI internally.
- Remove dependency on `@careercopilot/ui-library`.
- Do not add Storybook.

### 7. Enforce Local Quality Gates

- Run full lint before commit.
- Run tests before push.
- Keep Commitlint for commit message validation.
- Keep lint-staged for staged file formatting and fixable lint updates.

## Acceptance Criteria

- App builds successfully with `npm run build`.
- TypeScript passes with `npm run typecheck`.
- Lint passes with `npm run lint`.
- Atom component tests pass with `npm run test`.
- Commit hook runs lint before commit.
- Push hook runs tests before push.
- Button and Input components use local CareerCopilot tokens.
- No Storybook setup is added.
- Source code does not import tokens from `@careercopilot/ui-library`.

## Verification

- `npm run test` passed.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run build` passed.

## Related Commits

- `373b0f9 chore: scaffold react boilerplate tooling`
- `6bd43ac feat: add core app foundation`
- `a50709a feat: add auth state and service`
- `1133d7d feat: add app routing and pages`
- `365a25a test(ui): add atom component test coverage`
- `1d649a5 feat(ui): implement token-driven atom components`
- `dc867e3 chore(git): enforce lint and test hooks`

## Follow-Up Notes

- README still mentions the old UI library placeholder and should be updated in a docs cleanup ticket.
- Molecules and organisms folders are currently structural placeholders and can be filled as product flows become clearer.
