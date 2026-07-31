# Recent Changes

Status: project-state recent implementation and documentation history

Keep only the 10 most recent entries.

## Recent Changes

- 2026-07-31: Narrowed ADR-009 to passive database exfiltration and read-only database exposure; active database writes, relationship manipulation, deletion, rollback, and application-oracle attacks are explicitly out of scope. [Reason why added: resolves the first architecture-review blocker without introducing a row-integrity system.]

- 2026-07-30: Recorded the ADR-009 architecture review and blocked implementation pending correction of the threat model, transaction strategy, Better Auth adapter contract, maintenance write barrier, migration ownership, normalization, logging, and integration-test design. [Reason why added: prevents implementation from proceeding against a security design that the repository cannot currently execute or substantiate.]

- 2026-07-30: Accepted ADR-009 and revised the database-theft encryption plan around sensitive-content scope, separate environment keys, Better Auth-owned secret encryption, blind-indexed uniqueness, and a fully verified maintenance conversion with Neon point-in-time rollback. [Reason why added: records the approved security design while keeping implementation and production conversion explicitly unstarted.]

- 2026-07-30: Closed the retained-task rollout after manually accepting completion, restoration, collapsing, ordering, duplicate validation, editing, and deletion; verifying development isolation; and repeating the production smoke test. [Reason why added: records that no retained-task acceptance or monitoring work remains.]

- 2026-07-30: Split Neon into production and schema-only development branches, isolated local and `develop` Preview credentials, verified writes stay in development, and accepted the approval-gated migration workflow through idempotency and negative-guard tests. [Reason why added: prevents development and migration testing from modifying production data.]

- 2026-07-30: Changed task `changed_on` storage from epoch-millisecond `bigint` values to UTC timestamps while preserving the numeric client contract. [Reason why added: aligns task change times with `completed_at` and records the required data-preserving migration.]

- 2026-07-28: Added opt-in real-time validation borders with transitioned danger and success states while keeping sign-in passwords and 2FA credentials red-only. [Reason why added: records the deliberate validation-color scope and avoids implying that locally valid credentials were accepted by the server.]

- 2026-07-28: Moved content-sized toast notifications to the bottom center, capped long messages at `18rem`, and reserved red styling for failures by changing successful task deletion to the existing info state. [Reason why added: records the user-visible notification layout and semantic color behavior.]

- 2026-07-27: Implemented retained task completion with Base UI checkbox controls, collapsible Active and Completed groups, optimistic completion and restoration, active-only reordering, and case-insensitive title uniqueness across both groups. [Reason why added: records the local implementation before migration, manual acceptance, and deployment.]

- 2026-07-27: Production-verified the deployed password-reset flow. [Reason why added: records successful production smoke testing while rollout monitoring remains pending.]
