# ADR-014: Use reusable task tags and URL filters

## Status

Accepted

## Date

2026-08-04

## Implementation Status

Implemented on `feature/ATE-4-tags`. Formatting, linting, type checking, 30 unit
tests, and six guarded `atemoya_test` integration tests pass. Additive migration
`0010_task_tags` is verified at migration count `11` with journal timestamp
`1785930212109`. Preview acceptance and production promotion remain pending.

## Context

The task list needs reusable organization beyond task titles and manual order.
Users need to assign several tags to a task, distinguish tags by color, and
filter both active and completed tasks without losing the existing task order.

The design must preserve the RSC-first read boundary from ADR-007, the dense
active-task positions from ADR-005, retained completed tasks from ADR-012, and
the passive database-exfiltration protection from ADR-009. User-authored tag
names are sensitive content, while filter URLs must remain useful across page
refreshes and browser navigation.

## Domain Model

- A **tag** is a reusable user-owned entity with stable identity, encrypted
  lower-case name, and color. It may exist without any task assignments.
- A **task-tag assignment** is a same-user relationship between one task and one
  tag. It has no independent ordering or lifecycle after either parent is
  deleted.
- A **filter selection** is an ordered URL representation of at most ten tag
  IDs, interpreted as a set with AND semantics.
- A **visible reorder slot** is a position in the complete active-task order
  occupied by a task matching the current filter. Filtered drag operations
  replace tasks only within those slots.

## Decision

Add reusable, user-owned tags and many-to-many task assignments.

Store tags in a `tags` table with an opaque ID, owning user ID, encrypted name,
per-user name blind index, and color. Store assignments in a `task_tags` join
table containing the owning user ID, task ID, and tag ID. Composite foreign keys
from `(user_id, task_id)` to `tasks` and `(user_id, tag_id)` to `tags` enforce
same-user ownership, cascade task and tag deletion, and prevent duplicate
assignments. Use `(user_id, task_id, tag_id)` as the assignment primary key.
Existing tasks begin without tags and require no data conversion.

Tag names follow these rules:

- trim and convert input with JavaScript `toLowerCase()` before storage
- allow ordinary text and spaces
- limit names to 32 characters
- enforce per-user normalized uniqueness through a dedicated `tag-name:v1`
  blind-index domain rather than reusing the task-title domain
- encrypt names with the ADR-009 application-encryption boundary, binding each
  value to model `tags`, field `name`, and the tag record ID

Colors are normalized six-digit hexadecimal values and remain readable as
non-sensitive presentation metadata. The application provides a fixed palette
and permits a custom color. It computes a readable dark or light foreground
from relative luminance, and always displays the tag name so color is never the
only conveyed information. A task can have at most ten tags.

Use the following interaction model:

- create tasks without tags and assign tags only in the Edit Task dialog
- use one searchable multi-select picker in Edit Task
- keep assignment selections in form state and replace the task's complete tag
  set only when the task saves successfully; cancelling leaves assignments
  unchanged
- list available tags alphabetically after decryption
- allow tag creation only from the Edit Task picker as an immediate independent
  mutation; a created tag remains available if the edit is cancelled or fails
  to save
- show all owned tags in task pickers and Manage tags, but show only tags
  assigned to at least one active or completed task in the filter Combobox
- provide a Manage tags dialog from Settings for rename, recolor, and confirmed
  deletion
- deleting a tag removes all its assignments but never deletes tasks
- sort each task's assigned tags alphabetically, show the first two tag chips,
  and follow them with a `+N` Base UI Popover trigger when more remain; the
  popover lists every remaining tag for pointer, touch, and keyboard users
- apply one filter selection to both Active and Completed groups
- allow at most ten selected filters and explain the limit accessibly
- show filtered and total group counts and a clearable empty state

Use Base UI components when their semantics fit. In particular, use a
controlled multiple-selection `Combobox` for the tag filter so the full-width
project-style input can narrow the finite set of existing tags by name without
creating free-form values. Show `Filter by tag` only while no tag is selected,
keep the typed query transient, and render selected filters as Base UI Combobox
chips inside the input. Omit the selected count and separate disclosure icon. A
chip's remove control is visually hidden until hover or keyboard focus and
overlays a masked section of chip text without reserving space. The anchored list lays tags out
inline with wrapping, moves selected tags to the start, and marks them with a
layout-stable color-matched shadow. Use
Base UI form and dialog primitives around task assignment and tag management,
including a searchable multiple `Combobox` for the Edit Task tag picker. Base UI
1.6 has no color picker, so use `react-colorful`'s controlled `HexColorPicker` for
custom colors rather than implementing color-area, pointer, keyboard, or touch
behavior.

Use `nuqs` as the URL-state owner. Install its Next.js App Router adapter at the
existing root layout boundary. Store selected opaque tag IDs as repeated `tag`
query parameters, use shallow updates without scrolling, and replace the
current history entry on each filter change. Remove the query parameter when no
filters are selected. Do not put tag names in URLs. Ignore unknown, deleted, or
foreign tag IDs when filtering and prune them from the URL. Also prune selected
tags that no longer have any task assignments because they are no longer valid
filter options.

If a modified URL contains more than ten valid IDs, retain the first ten and
prune the remainder.

Filtering uses AND semantics: every selected tag must be assigned to a task,
but the task may have additional tags. Filtering operates in the existing
client task-list island over server-rendered task data and does not refetch or
change persisted order.

Allow drag reordering while filters are active. Reorder only the visible active
tasks relative to one another, merge their IDs back into the same visible slots
of the complete active-task order, and send the complete ordered ID list through
the existing authenticated reorder action. Hidden tasks therefore retain their
positions relative to the visible slots.

All task and tag mutations validate authentication and ownership. Task writes
accept the complete desired tag-ID set, validate that its IDs are distinct,
existing, and owned by the same user, then update the task and replace its
assignments atomically. Tag deletion and its assignment removal are atomic.
PostgreSQL composite foreign keys remain the final ownership barrier if
application validation regresses. Creating a tag whose normalized name already
exists returns and selects the existing tag without changing its color.
Renaming to an existing name remains a validation error. Stale assignments,
invalid colors, and foreign IDs return friendly errors without exposing
protected values.

Ship the schema as one additive Drizzle migration through development, Preview
acceptance, and then production. The migration creates empty tables and
supporting constraints without changing existing task rows, so it requires no
maintenance mode, data-conversion command, or backfill.

## Alternatives Considered

### Use native Next.js URL APIs

- Pros: No new dependency; `useSearchParams` and `URLSearchParams` can represent
  repeated tag IDs.
- Cons: The application would own parsing, default handling, history updates,
  and URL-state synchronization.
- Rejected: The product explicitly chooses `nuqs` for typed query parsing and
  controlled shallow history-replacement updates.

### Show every filter in a Base UI Toggle Group

- Pros: Every tag remains visible and can be toggled with one activation.
- Cons: A user-owned tag collection has no small fixed size, so wrapped toggle
  buttons can consume unbounded vertical space, especially on mobile.
- Rejected: Base UI's multiple Combobox preserves compact multi-selection and
  additionally lets users narrow a growing finite tag set by name.

### Store tags as JSON on each task

- Pros: Fewer tables for the initial schema.
- Cons: Duplicates reusable names and colors, complicates rename and deletion,
  weakens relational integrity, and makes encrypted uniqueness awkward.
- Rejected: Tags are reusable user-owned entities with independent lifecycle.

### Enforce assignment ownership only in application code

- Pros: A smaller join table and fewer supporting database indexes.
- Cons: A missed ownership predicate in any future write path could create a
  cross-user assignment that still satisfies ordinary foreign keys.
- Rejected: Same-user task/tag ownership is a durable database invariant, while
  application checks remain responsible for friendly errors.

### Allow only one tag per task

- Pros: Simpler schema and unambiguous grouping.
- Cons: Prevents useful combinations such as `work` and `urgent` and conflicts
  with the planned Things-inspired tag model from ADR-001.
- Rejected: Tasks may have multiple tags from the first release.

### Build a custom color picker

- Pros: No color-picker dependency and complete visual control.
- Cons: Requires application-owned pointer, touch, keyboard, ARIA, color-model,
  and cross-browser behavior.
- Rejected: `react-colorful` supplies the required controlled and accessible
  interaction in a small dependency.

## Consequences

- The database gains `tags` and `task_tags`, but existing task rows remain
  valid without backfill.
- Rollout follows the normal development-first migration workflow without an
  ADR-009-style maintenance or conversion procedure.
- Composite ownership keys add supporting indexes to `tasks` and `tags` so the
  database can reject cross-user assignments.
- Tag names receive the same passive-exfiltration protection and normalized
  equality model as task titles.
- URLs expose only opaque tag IDs and preserve filters across refreshes and
  browser navigation.
- The root layout gains `NuqsAdapter`; the client task-list island owns filter
  state while Server Components remain authoritative for reads.
- `nuqs` and `react-colorful` become intentional frontend dependencies.
- Filtered reordering requires a tested merge helper so hidden tasks never move
  accidentally.
- Focused unit and integration coverage must verify normalization, encryption,
  ownership, cascades, atomic assignments, AND filtering, URL parsing, and
  filtered reorder merging. Color tests must cover hexadecimal normalization
  and readable foreground selection.
- Preview acceptance must cover tag CRUD from Settings, preset and custom
  colors, untagged task creation, Edit Task assignment, compact chips, URL
  persistence, searchable Combobox filtering, filtered drag reorder, empty
  results, deletion,
  and mobile layout. It must also verify the third-party color picker and
  hidden-tag Popover with keyboard, touch, focus visibility, and accessible
  labeling.
