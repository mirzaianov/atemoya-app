# ADR-013: Use Neon branches for environment isolation

## Status

Accepted

## Date

2026-07-30

## Context

The application currently uses one Neon database for local development,
deployed previews, and production. This makes development writes and migration
testing capable of affecting production data.

The repository already separates application deployments:

- `develop` creates a Vercel Preview deployment.
- `main` creates the Vercel Production deployment.
- Local development loads `DATABASE_URL` through Varlock and KeePass.

The database environments should follow the same boundary without copying
production users, authentication records, or tasks into development.

## Decision

Use two long-lived branches in one Neon project:

- `production` stores live application data and serves Vercel Production
  deployments from `main`.
- `development` is a schema-only child of `production` and serves local
  development and the Vercel Preview deployment from `develop`.

Seed `development` only with synthetic test accounts and tasks.

Use separate branch connection strings and passwords. Protect `production`
when the Neon plan supports protected branches. Local development must have
access only to the development connection string.

Scope environment values as follows:

| Runtime           | Git stage | Neon branch   |
| ----------------- | --------- | ------------- |
| Local `pnpm dev`  | Local     | `development` |
| Vercel Preview    | `develop` | `development` |
| Vercel Production | `main`    | `production`  |

Use a distinct `BETTER_AUTH_SECRET` for development and production.

## Migration Strategy

Keep Drizzle migrations as the canonical schema history.

A schema-only Neon branch copies schema objects without table data. Establish
the development branch's initial migration baseline by copying only the
`drizzle.__drizzle_migrations` records that correspond to the production
schema. Do not copy application or authentication rows.

Promote future schema changes in this order:

1. Run pending migrations against `development` from the reviewed feature
   branch.
2. Verify the application against the development branch.
3. Merge the feature into `develop` for its Vercel Preview deployment.
4. Run the same migrations against `production` through an explicitly approved
   production workflow.
5. Merge `develop` into `main` for the Vercel Production deployment.

Do not run migrations during `next build`. Use expand-and-contract migrations
when a schema change would otherwise be incompatible with the currently
deployed application.

## Operational Safeguards

- Store development and production database URLs in separate Vercel and GitHub
  environment scopes.
- Require approval through a protected GitHub Production environment before
  running production migrations.
- Never print database URLs in workflow logs.
- Confirm Neon restore coverage before each production migration.
- Stop deployment when a migration fails; do not automatically reverse SQL
  migrations.
- Recreate development from a schema-only branch, restore its migration
  baseline, and reseed synthetic data when a clean environment is required.

## Alternatives Considered

### Separate Neon projects

- Pros: strongest project-level isolation and independent administration.
- Cons: duplicates project management and may increase plan or cost
  requirements.
- Rejected because branch-level isolation is sufficient for this personal
  application when production protection and credential separation are used.

### Branch for every preview deployment

- Pros: each code branch receives an isolated disposable database.
- Cons: requires branch creation, migration, seeding, and cleanup automation.
- Rejected because only `develop` and `main` currently deploy and one shared
  development database is sufficient.

### Continue using one database

- Pros: no environment-management work.
- Cons: development and migration testing can modify production data.
- Rejected because it does not provide a safe deployment path.

## Consequences

- Local and preview testing no longer writes to production.
- Development never contains production application or authentication data.
- Production and development still share Neon project-level administration,
  limits, and deletion risk.
- Schema-only branch creation requires a one-time Drizzle migration-baseline
  step.
- Database promotion becomes an explicit prerequisite for deployment.
- Development resets discard synthetic data and require reseeding.

## References

- [Neon branching workflows](https://neon.com/docs/get-started-with-neon/workflow-primer)
- [Neon protected branches](https://neon.com/docs/guides/protected-branches)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
