# ADR-011: Use Ultracite presets for Oxlint and Oxfmt

## Status

Accepted

## Date

2026-07-18

## Context

The project already uses Oxlint and Oxfmt, but its configuration only enables a
small manually selected rule set. Maintaining complete React, accessibility,
and Next.js rule coverage locally would duplicate an existing preset and make
tool upgrades harder to review.

Ultracite provides shareable Oxlint and Oxfmt presets. The project wants its
opinionated Oxlint conventions without replacing established Oxfmt output or
changing the existing lint-only script semantics.

## Decision

Use Ultracite as the maintained preset layer for the existing Oxlint and Oxfmt
toolchain:

- Extend the Ultracite core, React, and Next.js Oxlint presets.
- Retain the local statement-padding plugin accepted in ADR-008.
- Treat Ultracite's inherited lint rules as the repository lint conventions
  without compatibility overrides.
- Extend the Ultracite Oxfmt preset while preserving the existing print width,
  quotes, trailing commas, prose wrapping, and import order.
- Keep `pnpm lint`, `pnpm format`, `pnpm format:check`, and `pnpm typecheck` as
  separate commands. Use `pnpm check` as their aggregate quality gate.
- Do not enable type-aware Oxlint until it provides enough additional value to
  justify its dependency and runtime cost.

## Alternatives Considered

### Run `ultracite init`

- Pros: Automatically configures the provider and integrations.
- Cons: May change editor, agent, hook, TypeScript, and formatting settings that
  the repository already manages.
- Rejected: Manual configuration keeps the migration scoped and reviewable.

### Adopt every Ultracite lint and formatting default

- Pros: Requires fewer local overrides.
- Cons: Replaces established formatting and creates unrelated repository-wide
  documentation and import-order churn.
- Rejected: The project intentionally adopts Ultracite's lint conventions, not
  all of its formatting choices.

### Keep only local Oxlint and Oxfmt configuration

- Pros: Avoids another dependency.
- Cons: Leaves framework and ecosystem rule coverage to be maintained locally.
- Rejected: Ultracite provides useful maintained coverage while preserving the
  underlying tools.

## Consequences

- Oxlint gains maintained core, React, accessibility, and Next.js rule coverage.
- Existing code conforms to Ultracite's inherited lint rules.
- Oxfmt keeps the established repository output.
- Ultracite upgrades may introduce new rules and must be reviewed before
  upgrading.
- The local padding plugin remains necessary until Oxlint or Ultracite provides
  an equivalent rule.
