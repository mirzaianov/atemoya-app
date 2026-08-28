# Lint Suppression Removal Implementation Plan

Status: implemented on 2026-08-28

**Goal:** Remove every inline lint and type-check suppression comment while preserving intentional serial database conversion, framework callback contracts, query-client lifetime, and tag ordering.

**Architecture:** Fix suppressions by restructuring the affected modules without changing observable behavior. Sequential database pages use async recursion, Better Auth work uses executable operation objects, synchronous assertions capture errors explicitly, and array sorting uses standalone operations on fresh arrays. No inline directives or compatibility overrides remain.

**Tech Stack:** TypeScript, React 19, Next.js App Router, TanStack Query 5, Oxlint with Ultracite presets, Node test runner, pnpm.

## Global Constraints

- Do not add dependencies or change the ES2020 browser/runtime target.
- Do not use `toSorted()`; retain compatible in-place sorting on fresh arrays.
- Do not parallelize database conversion batches, commits, hooks, or verification.
- Do not change Better Auth callback contracts or make synchronous assertion callbacks asynchronous.
- Do not add inline `eslint-*`, `oxlint-*`, `@ts-*`, formatter, or equivalent suppression comments.
- Preserve unrelated working-tree changes.

---

## Task 1: Refactor serial and callback constraints

**Files:**

- Modify: `src/db/data-conversion.ts`
- Modify: `src/lib/better-auth-data-protection.ts`
- Modify: `src/lib/data-protection.unit.test.ts`

- [x] Remove the seven `no-await-in-loop` directives from `src/db/data-conversion.ts`.

- [x] Replace cursor loops with async recursion while preserving page order, atomic commits, hooks, verification, and counters.

- [x] Replace the Better Auth callback runner with executable operation objects while preserving synchronous and asynchronous error sanitization.

- [x] Replace the synchronous `assert.throws` predicate with explicit error capture and equivalent assertions.

- [x] Verify the refactored conversion and data-protection behavior:

```powershell
pnpm exec oxlint src/db/data-conversion.ts src/lib/better-auth-data-protection.ts src/lib/data-protection.unit.test.ts
pnpm test
```

Expected: both commands pass.

- [ ] Commit this slice:

```text
refactor(ATE-58): Remove inline lint suppressions
```

---

## Task 2: Replace the suppressed QueryClient initialization

**Files:**

- Modify: `src/components/query-provider.tsx`

- [x] Remove the `react/hook-use-state` directive and the `useState` import.

- [x] Follow TanStack Query’s App Router lifetime pattern: create a fresh client during server rendering and reuse one browser client across suspense retries.

```tsx
import { environmentManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';

const makeQueryClient = () => new QueryClient();

let browserQueryClient: QueryClient | undefined;

const getQueryClient = () => {
  if (environmentManager.isServer()) {
    return makeQueryClient();
  }

  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
};
```

- [x] Replace the suppressed state initializer inside `QueryProvider` with:

```tsx
const queryClient = getQueryClient();
```

- [x] Verify lint and types:

```powershell
pnpm exec oxlint src/components/query-provider.tsx
pnpm typecheck
```

Expected: both commands pass and no hook lint exception remains.

- [ ] Commit this slice:

```text
refactor(ATE-58): Stabilize QueryClient initialization
```

---

## Task 3: Remove array-sort suppressions

**Files:**

- Modify: `src/db/queries.ts`
- Modify: `src/db/tag-queries.ts`
- Modify: `src/features/settings/settings.tsx`
- Modify: `src/features/home/tag-picker.tsx`
- Modify: `src/features/home/task-row.tsx`

- [x] Delete the unused `unicorn/no-array-sort` directive in `src/db/queries.ts`. Keep its existing standalone `assignedTags.sort(...)` statement.

- [x] In each remaining file, first create the fresh result array, then sort it as a standalone statement, then return it. Preserve the existing comparator exactly.

Use this shape in `src/db/tag-queries.ts`:

```ts
const decryptedTags = records.map(decryptTag);
decryptedTags.sort((left, right) => /* existing comparator */);
return decryptedTags;
```

Use this shape in `src/features/settings/settings.tsx`:

```ts
nextTags.sort((left, right) => /* existing comparator */);
return nextTags;
```

Use this shape in `src/features/home/tag-picker.tsx`:

```ts
const mergedTags = [...tagsById.values()];
mergedTags.sort((left, right) => /* existing comparator */);
return mergedTags;
```

Use this shape in `src/features/home/task-row.tsx`:

```ts
const sortedTags = [...task.tags];
sortedTags.sort((left, right) => /* existing comparator */);
return sortedTags;
```

- [x] Verify all affected modules:

```powershell
pnpm exec oxlint src/db/queries.ts src/db/tag-queries.ts src/features/settings/settings.tsx src/features/home/tag-picker.tsx src/features/home/task-row.tsx
pnpm typecheck
pnpm test
```

Expected: all commands pass and tag order remains unchanged.

- [ ] If `TEST_DATABASE_URL` is configured for the dedicated `atemoya_test` database, run the guarded integration suite:

```powershell
pnpm test:integration
```

Expected: the guarded database, task, tag, and Better Auth tests pass. Do not point this command at development or production.

- [ ] Commit this slice:

```text
refactor(ATE-58): Remove array sort suppressions
```

---

## Task 4: Restore the repository-wide quality gate

**Files:**

- Modify: `src/features/signup/signup.tsx`

- [x] Add the missing blank line between the `try`/`catch` statement and `startNavigation(...)`. Do not alter the sign-up flow.

- [x] Verify that the repository contains no inline lint, type-check, or formatter suppression comments:

```powershell
rg -n --hidden -i -g '!node_modules/**' -g '!.next/**' -g '!coverage/**' -g '!.git/**' 'eslint-(disable|enable)|oxlint-(disable|enable)|stylelint-(disable|enable)|biome-ignore|deno-lint-ignore|lint-(disable|enable)|noqa|ruff:\s*noqa|nolint|@ts-ignore|@ts-expect-error|prettier-ignore|oxfmt-ignore' .
```

Expected: no matches and exit code `1`, which is ripgrep’s normal “nothing found” result.

- [x] Run the complete local quality gate:

```powershell
pnpm check
pnpm test
git diff --check
```

Expected: all commands pass.

- [ ] Commit this slice:

```text
chore(ATE-58): Restore lint cleanliness
```

---

## Task 5: Document the suppression-free policy

**Files:**

- Modify: `docs/decisions/ADR-011-use-ultracite-presets-for-oxlint-and-oxfmt.md`
- Modify: `docs/state/current-status.md`
- Modify: `docs/state/recent-changes.md`
- Modify only if the active priority changes: `docs/state/next-steps.md`

- [x] Amend ADR-011 to prohibit inline suppression directives and compatibility overrides.

- [x] Record how async recursion, executable operation objects, and explicit synchronous error capture preserve the original semantics without exceptions.

- [x] Update project state to record the completed cleanup and zero-inline-suppression baseline. Keep the recent-changes list at its established size and do not invent a new next step if priorities are unchanged.

- [x] Verify documentation formatting and final repository state:

```powershell
pnpm format:check
pnpm check
git diff --check
```

Expected: all commands pass.

- [ ] Commit this slice:

```text
docs(ATE-58): Document suppression-free linting
```

---

## Final Acceptance

- [x] `rg` finds no inline suppression directive in executable source or tooling files.
- [x] `pnpm check` passes.
- [x] `pnpm test` passes.
- [ ] The dedicated integration suite passes when its guarded test database is available.
- [x] Database conversion remains serial and atomic.
- [x] Better Auth and synchronous assertion callback behavior is unchanged.
- [x] QueryClient instances are isolated per server render and stable in the browser.
- [x] Tag sorting and displayed order are unchanged.
