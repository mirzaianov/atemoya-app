# ADR-008: Use a local Oxlint plugin for variable padding

## Status

Accepted

## Date

2026-07-17

## Context

The project uses Oxlint and Oxfmt without ESLint or Prettier. Oxlint 1.71 does
not have a native equivalent of `padding-line-between-statements`, but it can
load ESLint-compatible JavaScript plugins through its alpha `jsPlugins` API.
Oxlint 1.73 and Oxfmt 0.58 still provide no native rule or formatter option for
padding complete `try` statements.

## Decision

Use the repository-local `oxlint-plugin.mjs` to require blank lines between a
contiguous group of `const`, `let`, or `var` declarations and adjacent
non-declaration statements. A declaration group at the beginning or end of a
statement list does not require padding beyond that boundary. Also require a
blank line before each `return` statement unless it is the first statement in
its statement list, and blank lines around each complete `try`/`catch`/`finally`
statement when it has adjacent statements. Keep `catch` and `finally` clauses
attached to their `try` statement.

Register it through Oxlint's `jsPlugins` configuration and test its focused
behavior with Node's built-in test runner. Keep `pnpm lint` as the project-wide
entry point.

## Alternatives Considered

### Add ESLint or a stylistic plugin

- Pros: Provides an established configurable rule.
- Cons: Duplicates the current linter and adds dependencies for one convention.
- Rejected: The local rule preserves the smaller toolchain.

### Wait for native Oxlint support

- Pros: Avoids maintaining project code.
- Cons: Leaves the requested convention unenforced.
- Rejected for now: Replace the local plugin when Oxlint provides an equivalent
  native rule.

## Consequences

- Declaration groups are padded on both sides without another package.
- Complete `try` statements are padded externally without separating their
  `catch` or `finally` clauses.
- Return statements are visually separated from preceding statements.
- Oxlint's alpha JavaScript plugin API may require adjustment after upgrades.
