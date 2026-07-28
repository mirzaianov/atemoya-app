# ADR-012: Retain Completed Tasks

## Status

Accepted

## Date

2026-07-27

## Context

Tasks are currently either active or permanently deleted. The product needs a
Things-inspired completion control that preserves finished work, keeps deletion
destructive, and allows users to restore completed tasks.

The existing task list has user-defined ordering, case-insensitive duplicate
checks during creation, authenticated server actions, and a small sortable
client island. Base UI is the default primitive system for interactive controls.

## Decision

Store active and completed tasks in the existing `tasks` table. Add a nullable
`completed_at` timestamp:

```text
completed_at IS NULL     -> active
completed_at IS NOT NULL -> completed
```

Keep deletion as a hard delete. Do not add a soft-delete state or a separate
archive table.

Enforce case-insensitive title uniqueness across every task owned by a user,
including completed tasks, with a database unique index on
`(user_id, lower(title))`. Creation and editing must return a friendly conflict
message when the title is already reserved.

Completing a task sets `completed_at`, removes it from the active ordering, and
compacts the remaining active positions. Restoring clears `completed_at`,
inserts the task at active position zero, and shifts existing active positions.
Only active tasks can be reordered. Completed tasks sort by completion time,
newest first.

Render two groups:

- Active uses Base UI Collapsible and starts expanded.
- Completed uses Base UI Collapsible, starts collapsed, and is hidden when empty.
- Each header shows its task count.

Use Base UI Checkbox for the leading completion control. Follow the supplied
Things reference images with a small rounded-square visual inside an accessible
hit target. Active rows remain sortable. Completed rows are muted, struck
through, editable, restorable, and deletable.

Completion and restoration update the client list optimistically, roll back on
failure, show the existing toast feedback, and refresh authoritative Server
Component data after success. Reduced-motion preferences apply to checkbox,
group, and row transitions.

## Alternatives Considered

### Boolean completion flag plus timestamp

- Pros: The boolean makes the state name explicit.
- Cons: The boolean and timestamp can disagree.
- Rejected: Nullability already represents the two states and the timestamp
  records when completion occurred.

### Separate completed-task table

- Pros: Active and completed storage are physically separated.
- Cons: Completion and restoration require copying rows and coordinating schema
  changes across two tables.
- Rejected: One table keeps task identity and mutations simple.

### Soft deletion

- Pros: Deleted tasks could be recovered.
- Cons: It conflates completion retention with deletion recovery.
- Rejected: Deletion remains an explicit destructive action.

### Separate Logbook view

- Pros: Closest to Things 3 and keeps the active screen minimal.
- Cons: Adds navigation and another route before the core completion behavior is
  established.
- Rejected for now: A collapsed Completed group is the smaller first step.

## Consequences

- Existing tasks remain active because `completed_at` defaults to null.
- Completed titles remain reserved, so restoring cannot create a duplicate.
- Duplicate protection must cover create and edit paths and be enforced by the
  database to handle concurrent writes.
- Active ordering queries and reorder validation must exclude completed tasks.
- Completed tasks remain stored until explicitly deleted.
- The home list gains a non-sortable completed section but preserves the current
  RSC-first read and authenticated mutation boundaries.
- Browser automation is excluded from acceptance; focused automated checks and
  manual visual verification cover the feature.
