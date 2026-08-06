# Task Tags And Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable encrypted task tags, colored tag management, URL-backed AND filtering, and filtered drag reordering without changing hidden task positions.

**Architecture:** Add user-owned `tags` and same-owner `task_tags` tables, extend the existing encryption boundary for tag names, and keep all reads server-first. Existing client islands receive decrypted tags, while `nuqs` owns transient filter IDs and Base UI owns accessible selection, dialog, and popover behavior.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Neon PostgreSQL, Drizzle ORM, Base UI 1.6, TanStack Query, React Hook Form, Zod, dnd-kit, nuqs, react-colorful, Node test runner, Oxlint, and Oxfmt.

## Implementation Status

Tasks 1-8 are implemented and locally verified on `feature/ATE-4-tags`.
Migration `0010_task_tags` passes against guarded `atemoya_test` at migration
count `11` with journal timestamp `1785930212109`; `pnpm check`, all 30 unit
tests, all six integration tests, and `git diff --check` pass. The checklists
below retain the approved implementation recipe. Manual Migration And
Acceptance remains pending.

## Global Constraints

- Work only on `feature/ATE-4-tags`; merge feature branches into `develop`, then `develop` into `main`.
- Use Node 24 or newer and pnpm 11 or newer.
- Follow ADR-014 and preserve ADR-005, ADR-007, ADR-009, and ADR-012 behavior.
- Tag names are trimmed, converted with JavaScript `toLowerCase()`, limited to 32 characters, encrypted, and unique per user through `tag-name:v1` blind indexes.
- Colors are normalized opaque six-digit hex values; tag text is always present, so color is not the only signal.
- A task and the active filter may each contain at most ten tag IDs.
- Tag assignment ownership is enforced both in application validation and PostgreSQL composite foreign keys.
- The current `drizzle-orm/neon-http` driver does not support interactive `db.transaction()`; every atomic mutation must use one SQL statement, data-modifying CTEs, or an HTTP batch whose atomic behavior is explicitly verified.
- Use Base UI primitives where available, `nuqs` for URL query state, and `react-colorful` only for the custom color area.
- Do not add a browser-test framework for this feature; cover pure logic and database boundaries automatically and use the specified Preview acceptance checks.
- Do not inspect or commit `.env.local`, KeePass paths, encryption keys, database URLs, or other secrets.
- Do not create `docs/superpowers/`.

---

### Task 1: Add The Encrypted Tag Schema

**Files:**

- Modify: `src/lib/data-protection.ts`
- Modify: `src/lib/data-protection.unit.test.ts`
- Modify: `src/db/schema.ts`
- Modify: `src/db/database.integration.test.ts`
- Create: `drizzle/0010_task_tags.sql`
- Modify: `drizzle/meta/_journal.json`
- Create: `drizzle/meta/0010_snapshot.json`

**Interfaces:**

- Consumes: Existing `createDataProtection`, `EncryptionContext`, `tasks`, and `user` schema definitions.
- Produces: `tagNameLookup(userId: string, name: string): string`, encrypted `tags`, and same-owner `taskTags` schema exports.

- [ ] **Step 1: Add failing encryption tests**

Add cases proving dedicated lookup normalization and encryption context:

```ts
const encrypted = protection.encryptValue('work', {
  field: 'name',
  model: 'tags',
  recordId: 'tag-1',
});

assert.equal(
  protection.decryptValue(encrypted, { field: 'name', model: 'tags', recordId: 'tag-1' }),
  'work',
);
assert.equal(
  protection.tagNameLookup('user-1', ' Work '),
  protection.tagNameLookup('user-1', 'work'),
);
assert.notEqual(
  protection.tagNameLookup('user-1', 'work'),
  protection.taskTitleLookup('user-1', 'work'),
);
```

- [ ] **Step 2: Run the unit test and confirm failure**

Run: `pnpm test`

Expected: TypeScript execution fails because the `tags/name` encryption context and `tagNameLookup` do not exist.

- [ ] **Step 3: Extend the data-protection boundary**

Add `tags: new Set(['name'])` to `protectedFields`, add `{ field: 'name'; model: 'tags'; recordId: string }` to `EncryptionContext`, and expose:

```ts
tagNameLookup: (userId: string, name: string) => {
  if (!userId || userId.includes('\0')) {
    return fail('INVALID_LOOKUP_VALUE');
  }

  return createLookup('tags', 'name', 'tag-name:v1', name.trim().toLowerCase(), userId);
},
```

- [ ] **Step 4: Define relational ownership in Drizzle**

Add `tags` with `name_ciphertext`, `name_lookup`, `color`, and `user_id`. Add a unique `(user_id, name_lookup)` index and a supporting unique `(user_id, id)` index. Add a supporting unique `(user_id, id)` index to `tasks`.

Add `taskTags(user_id, task_id, tag_id)` with primary key `(user_id, task_id, tag_id)` and composite cascading foreign keys:

```ts
foreignKey({
  columns: [table.userId, table.taskId],
  foreignColumns: [tasks.userId, tasks.id],
  name: 'task_tags_user_task_fk',
}).onDelete('cascade');

foreignKey({
  columns: [table.userId, table.tagId],
  foreignColumns: [tags.userId, tags.id],
  name: 'task_tags_user_tag_fk',
}).onDelete('cascade');
```

Add `user`, `tasks`, `tags`, and `taskTags` relations without changing existing task columns.

- [ ] **Step 5: Generate and inspect migration 0010**

Run: `pnpm db:generate -- --name=task_tags`

Expected: `drizzle/0010_task_tags.sql` creates only the new tables, supporting unique indexes, primary key, and composite foreign keys. It must not update, delete, decrypt, or backfill existing rows.

- [ ] **Step 6: Extend guarded schema assertions**

Update the integration schema test to assert:

```text
tags: id, user_id, name_ciphertext, name_lookup, color
task_tags: user_id, task_id, tag_id
tags_user_id_name_lookup_unique_idx: unique
tags_user_id_id_unique_idx: unique
tasks_user_id_id_unique_idx: unique
task_tags_user_task_fk: composite cascading FK
task_tags_user_tag_fk: composite cascading FK
```

- [ ] **Step 7: Run focused verification**

Run: `pnpm test`

Run with the dedicated integration database configured: `pnpm test:integration`

Expected: all data-protection tests pass; schema integration reports migration count `11` and validates the new ownership constraints.

- [ ] **Step 8: Commit the schema slice**

```bash
git add src/lib/data-protection.ts src/lib/data-protection.unit.test.ts src/db/schema.ts src/db/database.integration.test.ts drizzle/0010_task_tags.sql drizzle/meta/_journal.json drizzle/meta/0010_snapshot.json
git commit -m "feat(ATE-4): Add encrypted tag schema"
```

---

### Task 2: Add Tag Validation And Persistence

**Files:**

- Create: `src/features/home/tag-schemas.ts`
- Create: `src/db/tag-queries.ts`
- Create: `src/features/home/tag-actions.ts`
- Modify: `src/db/database.integration.test.ts`
- Modify: `src/types.ts`

**Interfaces:**

- Consumes: `tags`, `taskTags`, `getDataProtection()`, authenticated session lookup, and security logging conventions.
- Produces: `Tag`, `TagFormValues`, `listTags`, `createTag`, `updateTag`, `deleteTag`, and authenticated tag actions.

- [ ] **Step 1: Add tag contracts**

Define the shared client type:

```ts
export interface Tag {
  color: string;
  id: string;
  name: string;
}
```

Define validation that transforms names and colors before persistence:

```ts
export const tagNameSchema = z
  .string()
  .trim()
  .min(1, 'Please enter a tag')
  .max(32)
  .transform((name) => name.toLowerCase());
export const tagColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/u, 'Choose a valid color')
  .transform((color) => color.toLowerCase());
export const tagSchema = z.object({ color: tagColorSchema, name: tagNameSchema });
```

Export `TagFormValues` directly from that schema with `z.infer`; do not duplicate the shape in another type.

- [ ] **Step 2: Add failing integration cases**

Cover encrypted-at-rest names, alphabetical decrypted reads, lower-case idempotent create, rename collision, recolor, ownership rejection, and cascading delete. Direct SQL assertions must verify `name_ciphertext` starts with `enc:v1:` and never equals the plaintext name.

- [ ] **Step 3: Implement tag database operations**

Create `src/db/tag-queries.ts` following `runTaskQuery` security logging. Export:

```ts
export const listTags: (userId: string) => Promise<Tag[]>;
export const createTag: (userId: string, input: TagFormValues) => Promise<Tag>;
export const updateTag: (userId: string, id: string, input: TagFormValues) => Promise<boolean>;
export const deleteTag: (userId: string, id: string) => Promise<boolean>;
```

`createTag` must generate ciphertext with `{ model: 'tags', field: 'name', recordId: id }`, insert with `ON CONFLICT (user_id, name_lookup) DO NOTHING`, and return the existing decrypted tag unchanged when a normalized duplicate wins the insert race.

`listTags` decrypts names and sorts with `name.localeCompare` after decryption. `deleteTag` is one owned `DELETE`; PostgreSQL cascades assignments atomically.

- [ ] **Step 4: Add authenticated server actions**

Create actions with the same session, validation, friendly-error, `revalidatePath('/')`, and strict logging boundaries as task actions:

```ts
interface TagActionResult {
  error?: string;
  tag?: Tag;
}

createTagAction(input: TagFormValues): Promise<TagActionResult>
updateTagAction(id: string, input: TagFormValues): Promise<TagActionResult>
deleteTagAction(id: string): Promise<TagActionResult>
```

Create returns the newly inserted or existing tag. Rename collisions return `Tag already exists`; raw database and cryptography errors never reach the client.

- [ ] **Step 5: Run persistence verification**

Run: `pnpm test`

Run: `pnpm test:integration`

Expected: duplicate create returns one stable tag, rename collision fails without mutation, cross-user updates/deletes return false, ciphertext is protected, and tag deletion leaves tasks intact.

- [ ] **Step 6: Commit tag persistence**

```bash
git add src/features/home/tag-schemas.ts src/db/tag-queries.ts src/features/home/tag-actions.ts src/db/database.integration.test.ts src/types.ts
git commit -m "feat(ATE-4): Add tag persistence"
```

---

### Task 3: Assign Tags Atomically To Tasks

**Files:**

- Modify: `src/types.ts`
- Modify: `src/db/queries.ts`
- Modify: `src/features/home/task-schemas.ts`
- Modify: `src/features/home/task-actions.ts`
- Modify: `src/features/home/task-form.tsx`
- Modify: `src/features/home/task-edit-dialog.tsx`
- Modify: `src/db/database.integration.test.ts`
- Modify: `app/page.tsx`
- Modify: `src/features/home/home.tsx`
- Modify: `src/features/home/task-list.tsx`
- Modify: `src/features/home/sortable-task-list.tsx`

**Interfaces:**

- Consumes: `Tag`, `tags`, `taskTags`, the ten-tag domain limit, and existing authenticated task actions.
- Produces: `Task.tags: Tag[]`, `TaskFormValues { title: string; tagIds: string[] }`, and task create/update operations that atomically replace the complete assignment set.

- [ ] **Step 1: Add failing assignment integration cases**

Cover create with zero and several tags, edit replacing the full set, duplicate IDs, more than ten IDs, missing/foreign IDs, task deletion cascade, tag deletion cascade, and list reads containing decrypted alphabetically sorted tags.

For every rejected input, assert that neither task fields nor assignments changed.

- [ ] **Step 2: Extend task contracts**

Add `tags: Tag[]` to `Task` and `TaskRecord`. Extend the form schema:

```ts
export const tagIdsSchema = z
  .array(z.string().uuid('Invalid tag'))
  .max(10, 'Choose no more than 10 tags')
  .refine((ids) => new Set(ids).size === ids.length, 'Choose each tag once');

export const taskSchema = z.object({
  tagIds: tagIdsSchema.default([]),
  title: z.string().trim().min(1, 'Please enter a task'),
});
```

- [ ] **Step 3: Read tags with tasks**

Extend `listTasks(userId)` to read owned assignments and owned tags, decrypt each tag once, group by task ID, sort each task's tags alphabetically, and return `tags: []` for untagged tasks. Continue ordering active tasks by dense position and completed tasks newest-first.

- [ ] **Step 4: Make create and update atomic with single SQL statements**

Change signatures to:

```ts
createTask(userId: string, title: string, tagIds: string[]): Promise<string>
updateTask(userId: string, id: string, title: string, tagIds: string[]): Promise<boolean>
```

Do not call `db.transaction()`. Build each mutation as one SQL statement with a requested-ID CTE, an owned-tag count guard, the task write, and assignment writes.

For update, delete only assignments absent from the requested set and insert only requested assignments with `ON CONFLICT DO NOTHING`; the two sets are disjoint, so the data-modifying CTEs never target the same join row.

- [ ] **Step 5: Update server actions and page data**

Change actions to accept parsed form values:

```ts
createTaskAction(values: TaskFormValues)
updateTaskAction(id: string, values: TaskFormValues)
```

In `app/page.tsx`, load `[tasks, tags]` with `Promise.all([listTasks(userId), listTags(userId)])`, map dates to numbers, retain task tag arrays, and pass `availableTags` through `Home` and `TaskList` to the sortable client island.

Update the existing form callers in the same commit so the new action contract is buildable before the picker UI exists: Add Task submits `tagIds: []`; Edit Task submits `editingTask.tags.map(({ id }) => id)` to preserve existing assignments. Task 6 replaces only the Edit Task default with user-controlled form state.

- [ ] **Step 6: Run atomicity verification**

Run: `pnpm test`

Run: `pnpm test:integration`

Expected: every task lifecycle path preserves tag assignments, invalid ownership writes nothing, and the existing complete/restore/reorder behavior remains green.

- [ ] **Step 7: Commit task assignments**

```bash
git add src/types.ts src/db/queries.ts src/features/home/task-schemas.ts src/features/home/task-actions.ts src/db/database.integration.test.ts app/page.tsx src/features/home/home.tsx src/features/home/task-list.tsx src/features/home/sortable-task-list.tsx
git commit -m "feat(ATE-4): Assign tags to tasks"
```

---

### Task 4: Add Pure Filtering And Reorder State

**Files:**

- Create: `src/features/home/tag-state.ts`
- Create: `src/features/home/tag-state.test.ts`
- Modify: `src/features/home/task-state.test.ts`

**Interfaces:**

- Consumes: `Task`, `Tag`, dense active-task order, AND filter semantics, and the ten-filter limit.
- Produces: `filterTasksByTagIds`, `getEligibleFilterTags`, `normalizeSelectedTagIds`, and `mergeFilteredTaskOrder`.

- [ ] **Step 1: Write failing pure tests**

Use tasks tagged `[work]`, `[urgent]`, `[work, urgent]`, `[work, urgent, personal]`, and `[]` to assert:

```ts
filterTasksByTagIds(tasks, ['work', 'urgent']).map(({ id }) => id);
// => tasks containing both IDs, including tasks with additional tags
```

Assert eligible filters exclude unassigned tags, normalization removes duplicates/unknown IDs and retains only the first ten, and no selected IDs returns the original task sequence.

For full order `[A-visible, B-hidden, C-visible, D-hidden]`, assert dragging C before A returns `[C, B, A, D]`.

- [ ] **Step 2: Confirm the tests fail**

Run: `node --test --experimental-strip-types src/features/home/tag-state.test.ts`

Expected: module-not-found failure for `tag-state.ts`.

- [ ] **Step 3: Implement the minimal pure helpers**

Implement AND filtering with `selectedIds.every`, eligible tags with one assigned-ID set, and normalization with stable deduplication, eligibility filtering, and `.slice(0, 10)`.

Implement filtered reorder by validating that old and new visible ID sets match, then replacing only positions occupied by visible tasks:

```ts
let visibleIndex = 0;
return allActiveTasks.map((task) =>
  visibleIdSet.has(task.id) ? reorderedVisibleTasks[visibleIndex++]! : task,
);
```

Return the original order when membership validation fails.

- [ ] **Step 4: Run focused and existing state tests**

Run: `node --test --experimental-strip-types src/features/home/tag-state.test.ts src/features/home/task-state.test.ts`

Expected: all filtering, normalization, reorder, completion, and restoration cases pass.

- [ ] **Step 5: Commit state logic**

```bash
git add src/features/home/tag-state.ts src/features/home/tag-state.test.ts src/features/home/task-state.test.ts
git commit -m "feat(ATE-4): Add tag filtering state"
```

---

### Task 5: Add URL-Backed Filtering And Task Chips

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `app/layout.tsx`
- Create: `src/features/home/tag-filter.tsx`
- Create: `src/features/home/tag-chip.tsx`
- Create: `src/features/home/tag.module.css`
- Modify: `src/features/home/sortable-task-list.tsx`
- Modify: `src/features/home/task-row.tsx`
- Modify: `src/features/home/task-list.module.css`

**Interfaces:**

- Consumes: `Tag`, `Task.tags`, Task 4 pure helpers, Base UI Combobox/Popover, and full-list `reorderTasksAction`.
- Produces: repeated `tag` query state, compact filter controls, two task chips plus an accessible overflow Popover, and filtered drag behavior.

- [ ] **Step 1: Install nuqs**

Run: `pnpm add nuqs`

Expected: only `package.json` and `pnpm-lock.yaml` dependency metadata changes.

- [ ] **Step 2: Add the App Router adapter**

Wrap the existing application providers without moving their ownership:

```tsx
import { NuqsAdapter } from 'nuqs/adapters/next/app';

<NuqsAdapter>{children}</NuqsAdapter>;
```

Keep every existing provider in its current relative order; this wrapper only supplies nuqs App Router context.

- [ ] **Step 3: Build the Base UI multiple Combobox filter**

Use a native repeated array parser and replace history:

```ts
const tagParser = parseAsNativeArrayOf(parseAsString).withDefault([]).withOptions({
  history: 'replace',
  shallow: true,
  scroll: false,
});
const [rawTagIds, setTagIds] = useQueryState('tag', tagParser);
```

Normalize against assigned eligible tags. Synchronize pruned IDs back to the URL only when the normalized sequence differs from the external query value. Render two selected chips plus `+N more`, a clear action, color swatches with text, search, and an accessible ten-selection limit.

- [ ] **Step 4: Integrate filtering and filtered reorder**

Derive filtered active and completed groups with `filterTasksByTagIds`. Show `visible of total` counts and one clearable no-results state. Pass only visible active IDs to dnd-kit, but merge the drag result into the complete active order with `mergeFilteredTaskOrder` before calling the unchanged full-list reorder action.

- [ ] **Step 5: Render compact task tags**

Create `TagChip` with visible name and computed foreground color. In `TaskRow`, render the first two alphabetically sorted tags and a Base UI Popover trigger labeled with the hidden count. The Popover lists every remaining tag and must work by pointer, touch, and keyboard.

- [ ] **Step 6: Run repository checks**

Run: `pnpm check`

Run: `pnpm test`

Expected: lint, format, types, and pure state tests pass. Confirm no task-title area regains `touch-action: none`.

- [ ] **Step 7: Commit URL filtering**

```bash
git add package.json pnpm-lock.yaml app/layout.tsx src/features/home/tag-filter.tsx src/features/home/tag-chip.tsx src/features/home/tag.module.css src/features/home/sortable-task-list.tsx src/features/home/task-row.tsx src/features/home/task-list.module.css
git commit -m "feat(ATE-4): Add URL-backed tag filter"
```

---

### Task 6: Add Tag Assignment To Edit Task

**Files:**

- Create: `src/features/home/tag-picker.tsx`
- Modify: `src/features/home/tag.module.css`
- Modify: `src/features/home/task-form.tsx`
- Modify: `src/features/home/task-edit-dialog.tsx`
- Modify: `src/features/home/task-actions.ts`
- Modify: `src/features/home/home.tsx`

**Interfaces:**

- Consumes: `Tag[]`, `TaskFormValues`, Base UI multiple Combobox, and complete-set task actions from Task 3.
- Produces: one assignment picker used by Edit Task with staged form-state selections.

- [ ] **Step 1: Build the shared assignment picker**

Create a controlled component:

```ts
interface TagPickerProps {
  disabled?: boolean;
  onChange: (tagIds: string[]) => void;
  tags: Tag[];
  value: string[];
}
```

Use Base UI multiple Combobox, alphabetical options, tag colors plus names, removable selected chips, and the same ten-selection limit. Do not persist assignment changes from this component.

- [ ] **Step 2: Keep Add Task untagged**

Keep `defaultValues: { tagIds: [], title: '' }`, render no tag picker, and submit the parsed values to `createTaskAction`. Reset both title and the hidden empty tag-ID array only after success.

- [ ] **Step 3: Add tag IDs to Edit Task form state**

When opening, reset with:

```ts
reset({
  tagIds: editingTask.tags.map(({ id }) => id),
  title: editingTask.title,
});
```

Cancel closes without mutation. Save sends the complete set to `updateTaskAction`; failure keeps the dialog and values open.

- [ ] **Step 4: Run task-form checks**

Run: `pnpm check`

Run: `pnpm test`

Expected: types and validation pass; existing title validation and duplicate-title behavior remain unchanged.

- [ ] **Step 5: Commit assignment UI**

```bash
git add src/features/home/tag-picker.tsx src/features/home/tag.module.css src/features/home/task-form.tsx src/features/home/task-edit-dialog.tsx src/features/home/task-actions.ts src/features/home/home.tsx
git commit -m "feat(ATE-4): Add task tag picker"
```

---

### Task 7: Add Tag Creation, Colors, And Management

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/features/home/tag-colors.ts`
- Create: `src/features/home/tag-colors.test.ts`
- Create: `src/features/home/tag-editor.tsx`
- Create: `src/features/home/tag-manager-dialog.tsx`
- Create: `src/features/home/tag-delete-dialog.tsx`
- Modify: `src/features/home/tag-picker.tsx`
- Modify: `src/features/home/tag-filter.tsx`
- Modify: `src/features/home/tag-chip.tsx`
- Modify: `src/features/home/tag.module.css`

**Interfaces:**

- Consumes: Tag actions, Base UI forms/dialogs/alert dialogs, and TagPicker/TagFilter.
- Produces: fixed palette, custom HexColorPicker, readable foreground helper, immediate inline creation, and full tag management.

- [ ] **Step 1: Install react-colorful**

Run: `pnpm add react-colorful`

Expected: dependency metadata changes only; do not add another color or popover library.

- [ ] **Step 2: Test color normalization and contrast**

Add tests for uppercase input normalization and black/white foreground selection at light, dark, and threshold-adjacent colors:

```ts
assert.equal(normalizeTagColor('#AABBCC'), '#aabbcc');
assert.equal(getTagForeground('#ffffff'), '#111111');
assert.equal(getTagForeground('#000000'), '#ffffff');
```

- [ ] **Step 3: Implement the minimal color boundary**

Export the fixed palette, `normalizeTagColor`, and `getTagForeground`. Parse six hex bytes, calculate sRGB relative luminance, and return whichever approved dark/light token has greater WCAG contrast. Do not add alpha, gradients, color names, or extra color spaces.

- [ ] **Step 4: Build one reusable tag editor**

Use Base UI Field for lower-case name and exact hex input, Base UI single-selection controls for palette colors, and `react-colorful`'s controlled `HexColorPicker` only when Custom is selected. Provide a visible label and pass an explicit `aria-label` to the third-party picker.

- [ ] **Step 5: Add immediate Edit Task creation**

From the Edit Task `TagPicker`, open the tag editor, call `createTagAction`, append the returned new-or-existing tag to local options, and select its ID. Do not expose creation from the Add Task picker. The tag remains persisted if the edit is cancelled. If the returned tag already existed, preserve its stored color.

- [ ] **Step 6: Add Manage tags**

Open `TagManagerDialog` from the filter controls. List all tags alphabetically, support rename/recolor through `updateTagAction`, and use a Base UI Alert Dialog before `deleteTagAction`. After success, refresh authoritative server props; deletion leaves tasks unchanged and removes assignments through cascade.

- [ ] **Step 7: Run focused and repository checks**

Run: `node --test --experimental-strip-types src/features/home/tag-colors.test.ts src/features/home/tag-state.test.ts`

Run: `pnpm check`

Run: `pnpm test`

Expected: color and state tests pass; no accessibility lint violations; no raw tag names appear in errors or logs.

- [ ] **Step 8: Commit management UI**

```bash
git add package.json pnpm-lock.yaml src/features/home/tag-colors.ts src/features/home/tag-colors.test.ts src/features/home/tag-editor.tsx src/features/home/tag-manager-dialog.tsx src/features/home/tag-delete-dialog.tsx src/features/home/tag-picker.tsx src/features/home/tag-filter.tsx src/features/home/tag-chip.tsx src/features/home/tag.module.css
git commit -m "feat(ATE-4): Add tag management"
```

---

### Task 8: Close Automated Verification And Documentation

**Files:**

- Modify: `docs/state/current-status.md`
- Modify: `docs/state/recent-changes.md`
- Modify: `docs/state/next-steps.md`
- Modify: `docs/architecture/overview.md`
- Modify: `docs/decisions/ADR-014-use-reusable-task-tags-and-url-filters.md`
- Modify: `docs/architecture/task-tags-and-filters-plan.md`

**Interfaces:**

- Consumes: Completed implementation, generated migration metadata, unit/integration results, and repository state conventions.
- Produces: Commit-ready verification evidence and implementation-status documentation.

- [ ] **Step 1: Run the complete local checks**

Run: `pnpm check`

Run: `pnpm test`

Run with `atemoya_test`: `pnpm test:integration`

Run: `git diff --check`

Expected: every command exits `0`; integration migration count is `11`; the latest migration equals the `0010` journal entry.

- [ ] **Step 2: Review the final migration and dependency surface**

Confirm `0010_task_tags.sql` is additive, no plaintext tag-name column exists, no migration touches existing task values, and only `nuqs` plus `react-colorful` were added as direct dependencies.

- [ ] **Step 3: Update canonical project documentation**

Record implementation status, encrypted tag schema, Base UI Combobox boundaries, URL filter ownership, filtered reorder semantics, migration number, and remaining rollout actions. Keep ADR-014 accepted and add a concise implementation-status section; do not duplicate the full plan in state docs.

- [ ] **Step 4: Commit verification and docs**

```bash
git add docs/state/current-status.md docs/state/recent-changes.md docs/state/next-steps.md docs/architecture/overview.md docs/decisions/ADR-014-use-reusable-task-tags-and-url-filters.md docs/architecture/task-tags-and-filters-plan.md
git commit -m "docs(ATE-4): Record tag implementation"
```

---

## Manual Migration And Acceptance

These steps happen only after Tasks 1-8 are committed and pushed.

1. In GitHub Actions, open `migrate-database` and choose **Run workflow**.
2. Select target `Preview` and enter the full feature-branch commit SHA containing `0010_task_tags.sql`.
3. Wait for success, then query the Neon development branch:

```sql
SELECT count(*) AS migration_count, max(created_at) AS latest_migration
FROM drizzle.__drizzle_migrations;
```

Expected: `migration_count = 11`; `latest_migration` matches migration `0010` in `drizzle/meta/_journal.json`.

4. Merge `feature/ATE-4-tags` into `develop` through a pull request and wait for the Vercel Preview deployment.
5. In Preview, create `work`, `urgent`, and one custom-color tag through Edit Task; create tasks untagged, then assign combinations through Edit Task.
6. Confirm task rows show two alphabetical chips and a keyboard/touch-accessible `+N` Popover.
7. Select `work` and `urgent`; confirm only tasks containing both remain, including tasks with additional tags.
8. Refresh, navigate away and back, and confirm the final filters remain while browser Back does not replay each filter click.
9. Reorder visible active tasks, clear filters, and confirm hidden tasks stayed in their original slots.
10. Complete and restore tagged tasks; confirm the same filter applies to Active and Completed.
11. Rename and recolor a tag; confirm every chip updates. Delete it; confirm tasks remain and the selected URL ID is pruned.
12. Verify palette and custom picker behavior with keyboard, touch, visible focus, and accessible labels on a mobile-width viewport.
13. In Neon development, confirm names are ciphertext and ownership constraints exist:

```sql
SELECT
  count(*) FILTER (WHERE name_ciphertext LIKE 'enc:v1:%') AS encrypted_tags,
  count(*) FILTER (WHERE name_lookup IS NOT NULL) AS indexed_tags
FROM tags;
```

14. Record the Preview-created tag IDs from the development query. Query Neon production with `SELECT id FROM tags WHERE id IN (...);` and confirm it returns zero rows.
15. In GitHub Actions, run `migrate-database` for target `Production` with the full lowercase SHA from current `develop` history that contains migration `0010`.
16. Confirm production migration count `11`, then merge `develop` into `main` through the allowed pull-request flow.
17. Wait for the Production deployment and run a focused smoke test: sign in, load existing tasks, create/tag/filter/reorder/delete one temporary task, then confirm existing tasks and authentication remain normal.

No maintenance mode, invocation drain, conversion command, or restore checkpoint is required because migration `0010` is additive and does not modify existing rows.
