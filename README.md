# Atemoya App

![MasterHead](./head.gif)

## Description

### A personal task and project manager inspired by Things 3

### Features

- Compelling UI & Solid UX
- Major browser compatibility
- Next.js full-stack app
- Email & Password Authentication
- Neon PostgreSQL persistence

### Dependencies

- `Next.js`
- `React` • `TypeScript`
- `Better Auth`
- `Neon` • `Drizzle`
- `CSS Modules`
- `Varlock`

## Installation & Execution

### Install

```bash
  git clone https://github.com/mirzaianov/atemoya-app.git
  cd atemoya-app
  pnpm install
```

### Configure environment

Add local KeePassXC connection values in `.env.local`:

```env
KP_DB_PATH=C:\path\to\database.kdbx
KP_PASSWORD=<keepass-database-password>
```

Then encrypt the local password:

```bash
  pnpm exec varlock encrypt --file .env.local
```

Varlock selects tracked KeePass references from `.env.dev` or `.env.prod`
according to `APP_ENV`. The files contain references only; secret values remain
in KeePass.

For development, add:

```text
atemoya-app/DATABASE_URL
atemoya-app/TEST_DATABASE_URL
atemoya-app/BETTER_AUTH_SECRET
atemoya-app/BETTER_AUTH_URL
atemoya-app/DATA_ENCRYPTION_KEYS
atemoya-app/BLIND_INDEX_KEYS
```

For guarded local production operations, add separate entries:

```text
atemoya-app/production/DATABASE_URL
atemoya-app/production/BETTER_AUTH_SECRET
atemoya-app/production/DATA_ENCRYPTION_KEYS
atemoya-app/production/BLIND_INDEX_KEYS
```

Each encryption keyring is one-line JSON in the form
`{"1":"<base64url-encoded 32-byte key>"}`. Generate the two values
independently; never reuse either key or `BETTER_AUTH_SECRET`. `.env.schema`
sets both local active versions to `1`.

`TEST_DATABASE_URL` is used only by `pnpm test:integration`. It must be the
direct connection string for database `atemoya_test` and role
`atemoya_test_owner` on the Neon `development` branch. Do not configure it in
Vercel or GitHub.

Local `DATABASE_URL` and `BETTER_AUTH_SECRET` values belong to the Neon
`development` branch. Keep production credentials out of `.env.local` and the
development KeePass entries. Production commands must set `APP_ENV=prod`
explicitly so Varlock loads `.env.prod`; remove that process variable after the
command finishes.

Use `http://localhost:3000` for `BETTER_AUTH_URL` in local development.

Run the guarded database integration tests with:

```bash
  pnpm test:integration
```

For Vercel, set `DATABASE_URL` and `BETTER_AUTH_SECRET` directly in Project
Settings -> Environment Variables:

| Vercel scope | Git branch | Neon branch   |
| ------------ | ---------- | ------------- |
| Preview      | `develop`  | `development` |
| Production   | `main`     | `production`  |

The Preview and local runtimes share the development Better Auth secret because
they use the same authentication tables. Production uses a separate secret.

Do not add `BETTER_AUTH_URL` on Vercel for normal deployments. The app trusts the active Vercel request host through Vercel System Environment Variables, so Preview uses `VERCEL_URL` or `VERCEL_BRANCH_URL`, and Production uses `VERCEL_PROJECT_PRODUCTION_URL`.

In Vercel Project Settings -> Environment Variables, enable System Environment Variables. Vercel then provides `VERCEL_PROJECT_PRODUCTION_URL` for the current production domain, `VERCEL_URL` for the current deployment URL, and `VERCEL_BRANCH_URL` for branch previews.

Before deploying encryption work, add `DATA_ENCRYPTION_KEYS` and
`BLIND_INDEX_KEYS` as Sensitive Preview variables, and add
`DATA_ENCRYPTION_ACTIVE_VERSION=1` and `BLIND_INDEX_ACTIVE_VERSION=1` to Preview.
Use the same development keyrings stored in KeePass. Do not add production
keyrings until the production-conversion checkpoint.

Do not configure KeePass variables on Vercel. The default `pnpm build` script uses Vercel environment variables directly; use `pnpm build:local` when you want a local production build through Varlock.

Database migrations run separately from application builds. Promote migrations
through the repository's `migrate-database` GitHub Actions workflow: test the
reviewed ref against the `Preview` environment first. Production requires a
full commit SHA from current `develop` history; use the current commit normally,
or a reviewed earlier ancestor when an expand/contract rollout must promote
migrations separately. See
[`ADR-013`](./docs/decisions/ADR-013-use-neon-branches-for-environment-isolation.md)
and the
[environment-isolation plan](./docs/architecture/neon-environment-isolation-plan.md).

### Run in the development mode

```bash
  pnpm dev
```

Next.js will start on [http://localhost:3000/](http://localhost:3000/)

To expose the dev server on your local network for device testing:

```bash
  pnpm dev
```

Set `ALLOWED_DEV_ORIGINS` to the comma-separated LAN hosts used by your devices, for
example `192.168.1.1`.

### Or open the deployed site

[https://www.atemoya.app/](https://www.atemoya.app/)

## Building and Running for Production

```bash
  pnpm build
  pnpm start
```

Next.js will start on [http://localhost:3000/](http://localhost:3000/)

For a local Varlock-backed production build:

```bash
  pnpm build:local
```

## License

### MIT license

You can use the code, but I ask you do not copy this site without giving me credit.
