# Task Drag-Reorder Design

Status: implemented

> Implementation update, 2026-07-15: route files moved from `src/app/` to root `app/`. The component boundary described below remains current.

## Goal

Add drag-drop reordering for tasks. The interaction must work with mouse and touch:
hold the row grip, move the task to a target location, and release it.

## Chosen Approach

Use a grip handle on each task row and implement sortable drag-drop with `@dnd-kit`.

This is preferred over native HTML drag-drop because touch support and sortable-list behavior are better covered by the library. It is preferred over custom Pointer Events because the project should not own low-level gesture math, collision handling, keyboard accessibility, or sortable animations unless a library fails.

## Data Model

Task order must persist in Neon/PostgreSQL. The current list is ordered by `changedOn`, which tracks edits and creation time, not user-defined order.

Add a numeric `position` column to `tasks`.

Expected ordering rules:

- `listTasks` orders by user-owned position, with a deterministic tie-breaker such as `changedOn` or `id`.
- New tasks are inserted at the top of the list with `position = 0`; existing user tasks shift down by one position in the same transaction.
- Reordering stores the final task ID order for the authenticated user.
- Server-side validation confirms every submitted id belongs to the current user before updating order.

Use dense integer positions. Sparse positions reduce write volume for very large lists, but dense positions are simpler and acceptable for this app.

## Component Shape

Keep the current RSC boundary:

- `src/app/page.tsx` and `src/features/home/home.tsx` remain server-rendered for session and initial data.
- The sortable list becomes a client island under `src/features/home`.
- Server actions stay in `task-actions.ts`.
- Database reads and writes stay in `src/db/queries.ts`.

Component split:

- `task-list.tsx`: server wrapper that passes tasks to the client list.
- `sortable-task-list.tsx`: client component that owns drag state and optimistic local order.
- `sortable-task.tsx`: client row component using `useSortable`.
- Edit/delete controls remain available through the row's right-side options button.

## Interaction

The grip handle is the only drag activator. Edit and delete buttons keep their existing behavior.

Recommended handle UI:

- Place a small vertical grip icon at the left edge of each task row.
- Use a real button or library-provided handle semantics.
- Provide an accessible label such as `Reorder task`.
- Use `cursor: grab`; while dragging, use `cursor: grabbing`.
- Keep the target size at least 48px on touch.
- Place a right-side options button for edit/delete actions so the row keeps a compact shape.

Drag behavior:

- Pointer/touch drag starts after a small distance or short press threshold to prevent accidental drags while scrolling.
- Drag is restricted to the vertical axis.
- While dragging, text selection is disabled for the list.
- Keyboard sorting remains available through `@dnd-kit` sortable keyboard support.

## Motion and Visual Design

Dragged task visual:

- Preserve the row's original dimensions; do not apply dnd-kit scale transforms.
- Stronger shadow using the existing neutral token language.
- Light primary-tinted background or border.
- Raised z-index.
- Slight opacity change only if readability stays strong.

Other tasks:

- Move out of the way during drag.
- Animate transform movement with a short spring-like/bouncy easing.
- Do not use `transition: all`.
- Respect `prefers-reduced-motion` by removing or shortening movement transitions.

The animation should feel responsive rather than decorative. Reordering is a repeated workflow, so motion must stay short.

## Persistence and Errors

Use optimistic UI:

1. User drops task.
2. Client updates local list order immediately.
3. Client calls a server action with the ordered ids.
4. Server validates auth and ownership, persists order, and revalidates `/`.
5. On failure, client restores the previous order and displays a concise list-level error.

Do not update `changedOn` during reorder. Reordering is not an edit to task content.

## Accessibility

Required behavior:

- Handle has an accessible name.
- Focus state remains visible.
- Drag interaction does not remove edit/delete keyboard access.
- Reduced-motion users do not get bounce movement.
- Touch users can drag without fighting page scroll.
- Screen reader users can still understand and operate the list if the library supports keyboard sortable semantics.

## Validation

Implementation should run:

- `pnpm format -- <changed files>`
- `pnpm typecheck`
- `pnpm lint`

Manual browser checks:

- Drag with mouse.
- Drag with touch or mobile emulation.
- Edit/delete still work.
- New order remains after refresh.
- Invalid/failed reorder restores the previous order.
- Reduced-motion mode does not bounce.

Manual acceptance:

- 2026-07-04: User confirmed drag reordering works after SQL target-column and integer-cast fixes.

## Out of Scope

- Multi-list drag-drop.
- Dragging completed vs active sections, because the app has no section model.
- Undo stack for reorder.
- Cross-device real-time sync.
