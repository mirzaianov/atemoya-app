# Recent Changes

Status: project-state recent implementation and documentation history

Keep only the 10 most recent entries.

## Recent Changes

- 2026-07-22: Completed the optional TOTP and backup-code authentication rollout, including deployment-database migration, production smoke testing, and post-rollout monitoring. [Reason why added: records full production acceptance of the 2FA feature.]

- 2026-07-21: Standardized every raised text button and button-styled link on the shared `standard` height variant and removed the obsolete `action` variant while retaining compact icon-control sizing. [Reason why added: records the project-wide control-height convention established during 2FA UI acceptance.]

- 2026-07-21: Implemented and manually accepted optional Better Auth TOTP and encrypted backup-code authentication, including Settings management, sign-in challenges, trusted devices, one-time and regenerated backup codes, lockout, disable, and other-session revocation. [Reason why added: records completion of the code path and full manual security-flow acceptance while production rollout remains pending.]

- 2026-07-20: Standardized active code and documentation on task-management
  terminology, including a data-preserving migration to the canonical tasks
  table and title column. [Reason why added: records the product-purpose cleanup
  and canonical persistence vocabulary.]

- 2026-07-20: Extended the local Oxlint statement-padding rule to require a
  blank line before non-leading return statements and migrated existing
  violations. [Reason why added: records the expanded enforced formatting
  contract and its repository-wide adoption.]

- 2026-07-20: Removed Oxlint compatibility overrides and migrated the codebase to
  Ultracite's inherited lint conventions while preserving the established Oxfmt
  settings. [Reason why added: records the intentional lint migration without
  implying a formatting-policy change.]

- 2026-07-18: Enabled React Compiler through Next.js, restored Ultracite's
  compiler diagnostics, and replaced incompatible form subscriptions and
  effect-driven derived state. [Reason why added: keeps automatic component
  optimization active without globally suppressing compiler findings.]

- 2026-07-18: Expanded the local Oxlint declaration-padding rule to require
  blank lines on both sides of declaration groups while exempting statement-list
  boundaries. [Reason why added: aligns the focused local rule with the relevant
  ESLint `padding-line-between-statements` behavior.]

- 2026-07-18: Removed unused repository-local agent settings because
  operational policy already lives in `AGENTS.md` and no project-local skills
  exist. [Reason why added: keeps the documented project-support structure
  aligned with the repository.]

- 2026-07-18: Added Ultracite as the maintained Oxlint and Oxfmt preset layer
  while preserving existing formatting, lint command boundaries, and the local
  declaration-padding rule. [Reason why added: records the expanded code-quality
  baseline without implying a repository-wide style migration.]
