# Confirmed UI Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove visual gaps after successful mutations by committing server-confirmed results locally before loading feedback ends, and by keeping navigation loading active until the destination route commits.

**Architecture:** Server Components remain the authoritative read path and TanStack Query remains the mutation lifecycle owner. Task and settings client islands keep only the confirmed data needed for immediate rendering, then call `router.refresh()` in the background for reconciliation; authentication flows combine mutation pending state with React transition pending state for route changes.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query 5, React Hook Form, Zod, Better Auth, TypeScript, Node test runner, Oxlint, and Oxfmt.

## Implementation Status

Implemented on 2026-08-08. All 31 unit tests and `pnpm check` pass. The guarded
integration suite was updated for the confirmed task/tag return contracts, but
its local run stopped during Varlock initialization because `.env.schema` could
not resolve `KP_PASSWORD`; no database connection or write occurred. Manual
interaction and Preview acceptance remain pending.

## Global Constraints

- Do not update task, settings, or authentication success UI before the server confirms success.
- Do not add TanStack Query read caches or a global client-state library.
- Keep Server Component reads authoritative and retain background `router.refresh()` reconciliation.
- Keep existing validation, error messages, toasts, ordering, tag filtering, and modal behavior.
- Treat mutation and navigation pending state as one uninterrupted loading interval.
- Do not change email-request flows that already replace pending feedback with local success or error state.

---

### Task 1: Return Confirmed Task And Tag Results

**Files:**

- Modify: `src/db/queries.ts`
- Modify: `src/db/tag-queries.ts`
- Modify: `src/features/home/task-actions.ts`
- Modify: `src/features/home/tag-actions.ts`
- Modify: `src/features/home/task-state.ts`
- Test: `src/features/home/task-state.test.ts`

**Interfaces:**

- Produces: `getTask(userId: string, id: string): Promise<TaskRecord | null>`.
- Produces: successful create and update task actions with `task?: Task` using millisecond timestamps.
- Produces: successful tag update actions with `tag?: Tag`.
- Produces: pure helpers that insert, replace, and remove confirmed tasks without mutating the previous array.

- [ ] **Step 1: Add failing task-state tests**

Cover a confirmed created task becoming the first active task, an edited task replacing the matching ID without changing order, and a deleted task being removed.

```ts
assert.deepEqual(insertConfirmedTask(tasks, created), [created, ...tasks]);
assert.deepEqual(replaceConfirmedTask(tasks, edited)[1], edited);
assert.deepEqual(
  removeConfirmedTask(tasks, deletedId),
  tasks.filter(({ id }) => id !== deletedId),
);
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `pnpm test -- src/features/home/task-state.test.ts`

Expected: FAIL because the confirmed-task helpers are not exported.

- [ ] **Step 3: Add the minimal persistence and action contracts**

Add a focused `getTask` query that reads one owned task and its owned tag assignments through the existing decryption boundary. Make create/update actions return the confirmed serialized task, and make tag update return the confirmed tag:

```ts
interface TaskActionResult {
  error?: string;
  task?: Task;
}

interface TagActionResult {
  error?: string;
  tag?: Tag;
}
```

Do not expose ciphertext, user IDs, or database records to client components.

- [ ] **Step 4: Implement and test the pure task helpers**

```ts
export const insertConfirmedTask = (tasks: Task[], task: Task) => [
  task,
  ...tasks.map((current) =>
    current.completedAt === null ? { ...current, position: current.position + 1 } : current,
  ),
];

export const replaceConfirmedTask = (tasks: Task[], task: Task) =>
  tasks.map((current) => (current.id === task.id ? task : current));

export const removeConfirmedTask = (tasks: Task[], id: string) =>
  tasks.filter((task) => task.id !== id);
```

Run: `pnpm test -- src/features/home/task-state.test.ts`

Expected: PASS.

### Task 2: Commit Confirmed Task CRUD Locally

**Files:**

- Modify: `src/features/home/home.tsx`
- Modify: `src/features/home/task-list.tsx`
- Modify: `src/features/home/sortable-task-list.tsx`
- Modify: `src/features/home/task-form.tsx`
- Modify: `src/features/home/task-edit-dialog.tsx`
- Modify: `src/features/home/task-delete-dialog.tsx`
- Modify: `src/features/home/task-row.tsx`
- Modify: `src/features/home/sortable-task.tsx`

**Interfaces:**

- Consumes: confirmed task action payloads and pure task helpers from Task 1.
- Produces: one nearest shared local task owner covering create, edit, delete, completion, filtering, and reordering.

- [ ] **Step 1: Move Task Form into the task-list client ownership boundary**

Render `TaskForm` from the same client owner that holds `orderedTasks`, preserving its existing position before tag filtering. Remove the separate form render from `Home`.

- [ ] **Step 2: Commit create results before clearing pending UI**

Add an `onCreated(task: Task)` callback to `TaskForm`. After a successful action result, call `onCreated(result.task)` before resetting the form and issuing a background refresh.

- [ ] **Step 3: Commit edit results before closing the dialog**

Add `onUpdated(task: Task)` to `TaskEditDialog`. Replace the matching task in `orderedTasks` before closing and resetting the dialog.

- [ ] **Step 4: Commit deletion before closing the dialog**

Thread `onDeleted(id: string)` from the list owner through `SortableTask` and `TaskRow` to `TaskDeleteDialog`. Remove the confirmed task before closing the dialog.

- [ ] **Step 5: Preserve authoritative reconciliation**

Keep `router.refresh()` after successful operations. It must not be the only path that changes visible task state.

- [ ] **Step 6: Run focused tests and static checks**

Run: `pnpm test -- src/features/home/task-state.test.ts`

Run: `pnpm typecheck`

Expected: both commands pass.

### Task 3: Commit Confirmed Settings Changes Locally

**Files:**

- Modify: `src/features/settings/settings.tsx`
- Modify: `src/features/settings/nickname-edit-dialog.tsx`
- Modify: `src/features/settings/two-factor-settings.tsx`
- Modify: `src/features/home/tag-manager-dialog.tsx`
- Modify: `src/features/home/tag-delete-dialog.tsx`

**Interfaces:**

- Consumes: confirmed tag payloads from Task 1.
- Produces: local confirmed nickname, two-factor enabled state, and tag collection at the nearest shared Settings client parent.

- [ ] **Step 1: Add local confirmed settings state**

Make `Settings` a client component and initialize:

```ts
const [nickname, setNickname] = useState(userNickname);
const [tags, setTags] = useState(initialTags);
const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialTwoFactorEnabled);
```

Use these values for visible fields and child props.

- [ ] **Step 2: Synchronize nickname success**

Add `onUpdated(nickname: string)` to `NicknameEditDialog`. Call it after server success and before closing the dialog, then refresh in the background.

- [ ] **Step 3: Synchronize tag edit and delete success**

Return the confirmed tag from update, replace it in the Settings tag collection before closing, and remove a deleted tag by ID before closing.

- [ ] **Step 4: Synchronize two-factor status**

Add `onEnabledChange(enabled: boolean)` to `TwoFactorSettings`. Set `true` after confirmed TOTP verification and `false` after confirmed disable, before background refresh.

- [ ] **Step 5: Run TypeScript validation**

Run: `pnpm typecheck`

Expected: PASS.

### Task 4: Keep Authentication Loading Through Navigation

**Files:**

- Modify: `src/features/login/login.tsx`
- Modify: `src/features/signup/signup.tsx`
- Modify: `src/features/home/account-menu.tsx`
- Modify: `src/features/two-factor/two-factor-challenge.tsx`
- Modify: `src/features/reset-password/reset-password.tsx`
- Modify: `src/features/settings/delete-account-dialog.tsx`

**Interfaces:**

- Produces: each route-changing mutation exposes one uninterrupted `isPending` value spanning the network mutation and the App Router transition.

- [ ] **Step 1: Add navigation transitions**

In each route-changing component, create:

```ts
const [isNavigationPending, startNavigation] = useTransition();
const isPending = mutation.isPending || isNavigationPending;
```

On confirmed success, wrap `router.push()` or `router.replace()` in `startNavigation`.

- [ ] **Step 2: Keep controls pending through route commit**

Pass the combined `isPending` to button loading, disabled state, dialog close guards, and relevant `aria-busy` attributes. Do not clear forms or close menus/dialogs between mutation success and route commit.

- [ ] **Step 3: Preserve exceptional auth branches**

Keep invalid credentials, unverified email, two-factor redirect, expired challenge, invalid reset token, and account-delete errors on their existing pages with pending state cleared normally.

- [ ] **Step 4: Run static checks**

Run: `pnpm typecheck`

Run: `pnpm lint`

Expected: both commands pass.

### Task 5: Record And Verify The Synchronization Rule

**Files:**

- Modify: `docs/decisions/ADR-007-use-local-ui-state-and-query-mutations.md`
- Modify: `docs/state/current-status.md`
- Modify: `docs/state/recent-changes.md`
- Modify: `docs/state/next-steps.md`

**Interfaces:**

- Documents: server-confirmed local commits for same-page mutations and transition-aware pending state for route-changing mutations.

- [ ] **Step 1: Amend ADR-007**

Record that `router.refresh()` is background reconciliation after local confirmed state is committed, and that route-changing mutations retain pending feedback through the React navigation transition. Record rejection of refresh-only visible synchronization and fully optimistic writes.

- [ ] **Step 2: Update project state**

Describe the implemented behavior in current status and recent changes. Add focused manual acceptance to next steps without marking deployment verification complete.

- [ ] **Step 3: Run complete repository checks**

Run: `pnpm test`

Run: `pnpm check`

Expected: both commands pass.

- [ ] **Step 4: Perform manual acceptance**

Verify create, edit, and delete task changes appear at the exact moment loading ends; nickname, tags, and two-factor controls show confirmed state immediately; and sign-in, sign-up, sign-out, two-factor sign-in, password reset, and account deletion retain loading until navigation completes.
