# Architecture Overview

## Current Application Shape

The project is a Next.js App Router personal task-management app. Routes live under root `app/`; feature UI, auth, and database code live under `src/`.

Primary local `dev`, `build:local`, and `start` scripts run Next.js through Varlock. The default `build` script runs plain `next build` so hosted builds can use platform environment variables directly.

## Database Environments

One Neon project contains two long-lived branches:

```text
local + develop Preview -> development
main Production         -> production
```

The `development` branch contains schema and synthetic test data only.
Environment-scoped `DATABASE_URL` and `BETTER_AUTH_SECRET` values select the
branch without runtime environment-switching logic. Drizzle migrations move
development-first through the manually dispatched `migrate-database` GitHub
Actions workflow and never run during the Vercel build.

Decision: `../decisions/ADR-013-use-neon-branches-for-environment-isolation.md`

Execution details: `neon-environment-isolation-plan.md`

## Planned Database-Theft Protection

ADR-009 accepts application-level encryption for sensitive task, identity,
session, and verification values. The design preserves readable relational and
operational metadata, uses separate production and development/Preview key
pairs, and retains current uniqueness behavior through HMAC blind indexes.
Better Auth continues to own password hashing and native TOTP and backup-code
encryption.

Implementation has not started and is blocked by the 2026-07-30 architecture
review. The threat model was narrowed on 2026-07-31 to passive database
exfiltration; active database writes and application-oracle attacks are out of
scope. Production conversion now uses maintenance-only shadow columns, a
restartable data command, and two canonical Drizzle migrations instead of a
database-wide interactive transaction. Better Auth encryption uses a thin
decorator around the installed Drizzle adapter that preserves joins,
transactions, set-valued conditions, and native atomic operations. The
remaining plan requires proven maintenance write fencing, consistent
normalization, redacted logging, and real-PostgreSQL integration tests. Revise
and approve the plan before development implementation or production
scheduling.

Decision:
`../decisions/ADR-009-use-application-encryption-for-sensitive-database-values.md`

Execution details: `database-theft-encryption-plan.md`

## Key Dependencies

- React renders the application and component state.
- Next.js owns routing under root `app`.
- Better Auth, Neon, and Drizzle support auth and task data.
- React Server Components are preferred for route shells and rendered data.
- `@dnd-kit` owns grip-handle sortable task reordering in a small client island.
- React Hook Form manages form-local client state.
- Zod validates form and server-action inputs.
- TanStack Query owns client mutation lifecycle and pending state without duplicating Server Component reads in its cache.
- Local React state owns transient task-list edit selection inside the sortable task-list client island.
- Base UI is the default headless UI component system for new or reworked interactive controls.
- CSS Modules provide component/page styling.
- Global CSS provides fonts, resets, and reusable CSS custom properties.
- Varlock loads local server-only environment values before development and local build commands.
- Vercel System Environment Variables provide production, preview, and branch-preview hostnames for Better Auth origin checks and fallback URL resolution.
- Ultracite supplies the canonical core, React, accessibility, and Next.js
  conventions for Oxlint. Oxfmt extends Ultracite while preserving the
  project's established output settings.

## Planned Platform Migration

ADR-002 accepts a staged migration from Vite/Firebase to Next.js App Router,
Neon PostgreSQL, Drizzle, and Better Auth.

Target route behavior:

- `/` is the authenticated homepage and task-list route.
- Unauthenticated users visiting `/` redirect to `/login`.
- `/login` hosts sign-in.
- `/signup` hosts sign-up and collects a unique nickname stored in Better Auth `user.name`.
- `/settings` hosts signed-in account settings.
- Authenticated users visiting `/login` or `/signup` redirect to `/`.

Detailed plan: `next-neon-better-auth-migration-plan.md`

Current migration progress:

- `app/page.tsx` validates a Better Auth session and renders the Neon-backed task-list route.
- `app/login/page.tsx` redirects authenticated users and renders Better Auth sign-in UI.
- `app/signup/page.tsx` redirects authenticated users and renders Better Auth sign-up UI.
- `app/settings/page.tsx` validates a Better Auth session and renders account settings with account removal.
- `app/api/auth/[...all]/route.ts` mounts Better Auth route handlers.
- The signed-in task-list shell and list render as Server Components; client islands are limited to forms, sign-out, edit-selection controls, and sortable task reordering.
- Task mutations run through authenticated server actions with Zod validation. Completion retains rows through nullable `completed_at` state, while active-only positions preserve drag order and completed tasks sort newest first.
- `src/db` contains the Drizzle schema, Neon client, and task query helpers, with generated migrations under `drizzle/`. A database unique index enforces case-insensitive task-title uniqueness per user across active and completed tasks.
- The legacy Vite/Firebase route surface has been removed.

State boundary decisions: `../decisions/ADR-003-rsc-first-client-state-boundaries.md` and `../decisions/ADR-007-use-local-ui-state-and-query-mutations.md`

Task drag-reorder decision: `../decisions/ADR-005-use-dnd-kit-for-task-reordering.md`

Retained task-completion decision: `../decisions/ADR-012-retain-completed-tasks.md`

UI component system decision: `../decisions/ADR-006-use-base-ui-as-default-ui-system.md`

Code-quality preset decision: `../decisions/ADR-011-use-ultracite-presets-for-oxlint-and-oxfmt.md`

Component composition diagram: `component-composition.mmd`

## UI Reference Direction

Future UI changes that move the app toward the Things-inspired personal task
model should use `../references/things-3-images/` as visual reference material.
Use the images for layout density, sidebar/content hierarchy, task-list
structure, and responsive adaptation. Do not copy the Things 3 interface
directly.

## Constraints

- Do not commit real database/auth credentials or local KeePass paths.
- Do not expose Neon or Better Auth secrets as `NEXT_PUBLIC_*` values.
- Keep local env values in ignored `.env.local` files.
- Preserve pnpm as the current package manager unless a migration is explicitly requested.
- Keep app changes small and verify with the configured format, typecheck, lint, and build scripts when the change warrants it.
