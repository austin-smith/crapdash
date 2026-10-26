# AGENTS.md

## Project overview

- Crapdash is a customizable dashboard for organizing links and services, intended for self-hosted deployments, built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, and shadcn/ui.
- The app is primarily server components, with client components added only when interactivity is required.
- Each deployment instance stores its editable dashboard config in `data/config.json`, updated via server actions in `lib/actions.ts`.

## Commands

### Install

- `pnpm install`

### Dev server

- `pnpm dev` (runs Next dev server on port 2727)

### Build + start

- `pnpm build` (Next production build)
- `pnpm start` (start production server)

### Lint

- `pnpm lint` (runs ESLint with Next config)
- `pnpm lint -- app/page.tsx` (lint a specific file or glob)

### Tests

- `pnpm test` (runs the Vitest suite once)
- Tests live under `tests/`; add focused coverage for meaningful behavior changes and bug regressions.

## Repository layout

- `app/` — Next.js App Router routes, layouts, and server components.
- `components/` — UI, admin, dashboard, and providers.
- `components/ui/` — shadcn/ui components (add via `pnpm dlx shadcn@latest add <component>`).
- `lib/` — server actions, data access, utilities, validation, and types.
- `data/` — persisted config and uploaded assets.
- `public/` — static assets.
- `tests/` — Vitest coverage for server actions, validation, data access, and shared behavior.

## Runtime behavior

- `lib/db.ts` reads/writes `data/config.json`.
- `lib/actions.ts` handles mutations and calls `revalidatePath` for `"/"` and `"/admin"`.
- Validation lives in `lib/validations.ts` (Zod).
- Icon files are written under `data/icons/` by `lib/file-utils.ts` and related helpers.

## Code style guidelines

### Imports

- Prefer the `@/*` alias for internal imports (configured in `tsconfig.json`).
- Group imports in this order: external packages, `next/*`, then `@/` aliases, then relative imports.
- Use `import type { Foo }` for type-only imports to keep TS emit clean.

### Client components

- Add `"use client"` only when hooks or event handlers are needed.

### UI components

- shadcn/ui components live in `components/ui/`; add new ones via `pnpm dlx shadcn@latest add <component>`.

### Styling

- Use `cn()` from `@/lib/utils` for className composition.

### Data + validation

- All mutations go through server actions in `lib/actions.ts`.
- Use Zod schemas from `lib/validations.ts` for form data and payload validation.
- When returning errors from actions, use the `ActionResult<T>` shape.

### Error handling

- Server actions return `{ success: false, errors: [...] }` instead of throwing.
- If a Zod validation fails, map `error.issues` to `ValidationError` entries.
- For unexpected errors, log and return a generic message (see patterns in `lib/actions.ts`).

## Branches, commits, and pull requests

- Use plain lowercase kebab-case for branch names. Keep names descriptive and do not include issue numbers, prefixes, or namespaces such as `feature/`, `fix/`, usernames, or agent names.
- Before every commit or amend, show the exact current diff and validation, then get explicit approval. Branch or pull-request requests are not commit approval; later changes require fresh approval.
- Never amend, rebase, squash, reset, rewrite history, or force-push without explicit approval for that exact operation.
- Write commit messages entirely lowercase. Use the imperative mood for the subject, keep each commit focused on one logical change, do not use type or scope prefixes, and do not end the subject with a period. Add a body when the reason or important tradeoffs are not clear from the subject.
- Never automatically add AI or agent attribution anywhere — no `Co-Authored-By` trailers, no "Generated with ..." footers — in commits, pull requests, issues, or comments.
- Keep each pull request focused on one coherent change.
- Write concise, specific, imperative pull request titles in sentence case. Do not use prefixes or trailing periods, and make the title understandable without the branch name.
- Pull request descriptions must include `What Changed`, `Why`, and `Validation`. Include `UI Changes` only when the pull request changes the UI. Keep descriptions concise, self-contained, complete, and accurate to the final diff.
- Link any related issues in the pull request description; do not include issue numbers in branch names.
- Review the complete diff before opening a pull request. Update the title and description whenever the scope changes, and remove unrelated changes.

## Issues

- Search open and closed issues before creating a new issue.
- Keep each issue focused on one problem or change.
- Use a concise, specific, sentence-case title without type prefixes.
- Give enough context to understand the issue without first inspecting the code.
- For bugs, describe the current and expected behavior. Include reproduction steps, environment details, and supporting evidence when available.
- For enhancements, explain the problem or goal, the desired outcome, and clear acceptance criteria.
- For UI issues, include screenshots. Include a short video when motion or interaction is relevant.
- Link any related issues and pull requests.
- Apply the appropriate existing labels when creating an issue: `bug` for defects, `enhancement` for feature requests, and `documentation` when the work primarily changes user or contributor documentation.

## Notes for agents

- Prioritize best practices and long-term maintainability over quick fixes.
- The dashboard is intended for self-hosted deployments; avoid dependencies that require external services.
- Instance config and uploads live under `data/`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
