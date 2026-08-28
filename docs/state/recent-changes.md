# Recent Changes

Status: project-state recent implementation and documentation history

Keep only the 10 most recent entries.

## Recent Changes

- 2026-08-28: Removed all 15 inline lint suppression directives without adding compatibility overrides, adopted TanStack Query's server-fresh/browser-stable client lifetime, rewrote tag sorting as standalone operations on fresh arrays, converted serial database batching to async recursion, and represented Better Auth adapter work through executable operation objects. Linting, formatting, TypeScript, and 31 unit tests pass. [Reason why added: establishes an exception-free source baseline while preserving conversion order, error sanitization, and external callback contracts.]

- 2026-08-09: Closed ADR-014 after applying additive migration `0010_task_tags` to Neon Production, confirming migration count `11` and latest migration `1785930212109`, and passing the focused Production smoke check. The migration resolved the generic Server Component render failure caused by deploying tag-backed reads before the Production schema. [Reason why added: records the completed tag rollout and its deployment-order lesson.]

- 2026-08-08: Removed post-mutation visual gaps by returning confirmed task and tag records, committing task CRUD and Settings changes to nearest-parent local state before pending feedback ends, and extending sign-in, sign-up, sign-out, two-factor sign-in, password-reset, and account-deletion loading through App Router navigation transitions. `router.refresh()` now reconciles these successful writes in the background. [Reason why added: records the implemented ADR-007 synchronization refinement before manual acceptance.]

- 2026-08-08: Reworked tag filtering into a searchable multiple Base UI Combobox whose full-width project-style input narrows existing tags by name and contains selected chips, hides its placeholder after selection, omits the count and disclosure icon, masks text beneath overlaid remove controls during hover or keyboard focus, and opens an anchored wrapping tag list with selected tags moved first and marked by color-matched shadows while preserving URL-backed AND semantics through Settings and `Go Home` navigation. [Reason why added: records the approved filter interaction refinement before Preview acceptance.]

- 2026-08-06: Implemented ADR-014 reusable task tags with encrypted lower-case names, atomic same-owner assignments, searchable Base UI Combobox assignment and filtering, `nuqs` URL-backed AND filtering, visible-slot drag reordering, compact chips, custom colors, and Settings-based tag management. Additive migration `0010` and all local checks passed against the guarded test database. [Reason why added: records the completed feature implementation baseline before deployment.]

- 2026-08-05: Extended the repository-local Oxlint statement-padding rule to require blank lines around complete `try`/`catch`/`finally` statements after confirming Oxlint and Oxfmt have no native equivalent. [Reason why added: records the enforced error-handling readability convention and why the local rule remains necessary.]

- 2026-08-04: Closed ADR-009 after Neon rejected the recorded production plaintext checkpoint as outside the available history window. [Reason why added: confirms the final six-hour restore-history condition passed and the database-theft encryption rollout is complete.]

- 2026-08-03: Completed the maintenance-gated Production encryption rollout: all application endpoints returned `503`, the 70-second drain completed, restore checkpoint `2026-08-03 16:03:34.60475+00` was recorded, additive migration `0008` applied, 25 rows converted, 27 protected records verified and reverified with zero writes, contract migration `0009` applied, and sign-in plus the encrypted task lifecycle passed after maintenance was disabled. [Reason why added: records operational acceptance before restore-history expiry.]

- 2026-08-03: Revised the protected production migration guard to require a full commit SHA from current `develop` history, allowing additive migration `0008` and contract migration `0009` to be promoted separately without permitting feature branches or unrelated refs. [Reason why added: resolves the production rollout conflict between strict branch flow and the approved expand/contract conversion sequence.]

- 2026-08-03: Split local Varlock references into explicit `.env.dev` and `.env.prod` files, removed required database and encryption defaults from `.env.schema`, completed independent production key provisioning in KeePass and Vercel Production, verified both database identities, proved missing production configuration fails closed, and accepted the merged Preview through sign-in plus an isolated encrypted task write and deletion. [Reason why added: prevents a production operator command from silently inheriting development credentials when its environment file is absent.]
