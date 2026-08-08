# ADR-007: Use local UI state and Query mutations

## Status

Accepted

## Date

2026-07-16

## Context

ADR-003 established an RSC-first application with Zustand limited to the task selected for editing. That selection is consumed entirely inside the sortable task-list client island, so a global store and dependency add indirection without coordinating independent application areas.

Network mutation state was also distributed across React Hook Form and component state. The application now needs one consistent pending-state owner for authentication, account, and task mutations while keeping Server Component reads authoritative.

## Decision

- Keep Server Components responsible for authenticated data reads and rendered route content.
- Keep authenticated Server Actions responsible for authorization, validation, writes, and revalidation.
- Use TanStack Query `useMutation` for client mutation lifecycle and pending state.
- Do not duplicate Server Component data in the TanStack Query client cache.
- Keep form values, validation, and field errors in React Hook Form and Zod.
- Keep task edit selection in local React state at the nearest shared client parent.
- After a successful same-page mutation, return the confirmed display record and commit it to
  local state before closing the surface or ending visible loading feedback.
- Treat `router.refresh()` as background reconciliation with the authoritative Server Component
  read, not as the only path that updates visible state.
- For successful mutations that navigate, combine TanStack Query mutation pending state with a
  React navigation transition so loading feedback remains visible until the destination commits.
- Remove Zustand because no cross-route or independently consumed global client state remains.

This decision supersedes ADR-003 only where ADR-003 assigns edit-selection state to Zustand. Its RSC-first boundary remains accepted.

## Alternatives Considered

### Keep the narrow Zustand store

- Pros: Existing implementation and a familiar global-state API.
- Cons: One local value requires a package, store files, and subscriptions across components that already share a client parent.
- Rejected: Local React state is sufficient and easier to trace.

### Move Server Component reads into TanStack Query

- Pros: One client-side API for reads and mutations.
- Cons: Duplicates authoritative server-rendered data and expands the client cache and hydration surface.
- Rejected: The existing RSC read path is smaller and already matches the application architecture.

### Put edit selection in the URL

- Pros: Shareable and browser-history aware.
- Cons: Edit selection is short-lived modal state with no current deep-linking requirement.
- Rejected: URL state adds behavior the product does not need.

### Depend on refresh for visible mutation results

- Pros: No confirmed Server Action payload or local result callback is required.
- Cons: Mutation pending state ends before the independent Server Component refresh commits,
  producing a visible gap with stale or missing content.
- Rejected: Refresh remains useful for reconciliation but cannot own immediate success feedback.

### Apply every mutation optimistically

- Pros: Changes appear before the network request completes.
- Cons: Validation, uniqueness, authentication, and persistence failures require rollback and can
  temporarily display data the server never accepted.
- Rejected: The product prefers server-confirmed updates with no post-spinner gap.

## Consequences

- The application has no global client-state store.
- Mutation buttons use one pending-state model and shared loading feedback.
- Edit selection remains colocated with the sortable list and its single edit dialog.
- Same-page mutation results render from confirmed local state before their surfaces close.
- Navigation mutations remain pending through the destination route transition.
- Server Component reads remain authoritative and reconcile confirmed local state after successful
  writes.
- A global state library should be reconsidered only when independently mounted areas need shared client-only state.
