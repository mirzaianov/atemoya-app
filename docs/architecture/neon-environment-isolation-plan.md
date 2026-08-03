# Neon Environment Isolation Implementation Plan

> **For agentic workers:** Execute this plan task-by-task in the current Codex
> session. Use a fresh implementation branch and stop at every manual-action
> gate for user confirmation.

**Goal:** Isolate development from production with two long-lived Neon branches
and a reviewed database-migration promotion path.

**Architecture:** Keep one Neon project with protected `production` and
schema-only `development` branches. Select the branch exclusively through
environment-scoped `DATABASE_URL` values, and run Drizzle migrations through a
manual GitHub Actions workflow before Vercel deploys the corresponding code.

**Tech Stack:** Neon PostgreSQL, Drizzle Kit, Varlock, KeePassXC, GitHub Actions,
Vercel, pnpm, Node.js 24.

## Global Constraints

- Never copy production application or authentication rows into development.
- Never print or commit a database URL, password, API key, or auth secret.
- Local development must not retain the production connection string.
- Vercel `develop` Preview deployments use `development`; `main` Production
  deployments use `production`.
- Development and production use distinct database passwords and
  `BETTER_AUTH_SECRET` values.
- Drizzle migration files remain the canonical schema history.
- Do not run migrations during `next build`.
- Require explicit approval before every production migration.
- Apply schema changes to development and verify them before production.
- Use expand-and-contract releases for backward-incompatible schema changes.

---

### Task 1: Inventory and Protect the Existing Production Branch

**Files:**

- No repository files change.

**Interfaces:**

- Consumes: the existing Neon project and production `DATABASE_URL`.
- Produces: an identified `production` branch with known restore coverage and,
  when supported by the Neon plan, branch protection.

- [ ] **Step 1: Record the current production resources**

In the Neon Console:

1. Open the project currently used by `www.atemoya.app`.
2. Open **Branches**.
3. Identify the branch referenced by Vercel Production's `DATABASE_URL`.
4. Record the project ID, branch ID, branch name, Postgres database name, and
   role name in a private password-manager note.
5. Do not paste the connection string into repository documentation or issue
   comments.

- [ ] **Step 2: Confirm the branch through SQL**

Open the Neon SQL Editor on the identified branch and run:

```sql
SELECT current_database() AS database_name, current_user AS role_name;

SELECT count(*) AS migration_count, max(created_at) AS latest_migration
FROM drizzle.__drizzle_migrations;
```

Save only the database name, role name, migration count, and latest migration
timestamp in the private note.

- [ ] **Step 3: Confirm restore coverage**

In Neon project settings:

1. Open the restore or history settings.
2. Confirm that the production branch has a restore window covering the planned
   migration period.
3. Record the window length in the private note.
4. Stop and resolve restore coverage before proceeding if no usable recovery
   point is available.

- [ ] **Step 4: Name and protect production**

1. Rename the live branch to `production` if it has another name.
2. If the Neon plan supports protected branches, open the branch and select
   **Protect**.
3. Confirm that Neon prevents deletion and reset of the protected branch.
4. If protection is unavailable, record that limitation and rely on the
   production workflow approval gate and credential separation.

- [ ] **Step 5: Verify no application configuration changed**

Open the production application and confirm:

- sign-in succeeds;
- the existing task list loads;
- no Neon or Vercel setting was changed except the optional branch name and
  protection state.

Expected: production behavior is unchanged.

---

### Task 2: Create and Initialize the Schema-Only Development Branch

**Files:**

- No repository files change.

**Interfaces:**

- Consumes: the accepted production schema and its Drizzle migration metadata.
- Produces: a `development` branch containing schema, migration history, and no
  production application data.

- [ ] **Step 1: Create the branch**

In the Neon Console:

1. Open the existing project and select **Branches**.
2. Select **Create branch**.
3. Set the branch name to `development`.
4. Select `production` as the parent.
5. Select the **Schema only** option.
6. Create a read-write compute for the branch.
7. Wait until the branch reports that it is ready.

Do not create a normal data-and-schema branch.

- [ ] **Step 2: Rotate development credentials**

1. Open the development branch's connection details.
2. Reset the inherited role password, or create a development-only role with
   equivalent ownership privileges.
3. Confirm that the development password differs from production.
4. Copy the pooled connection string into a temporary password-manager entry
   named `atemoya-app/development/DATABASE_URL`.
5. Do not place the value on the command line or in shell history.

- [ ] **Step 3: Prove that application data is absent**

Open the SQL Editor on `development` and run:

```sql
SELECT
  (SELECT count(*) FROM "user") AS users,
  (SELECT count(*) FROM account) AS accounts,
  (SELECT count(*) FROM session) AS sessions,
  (SELECT count(*) FROM verification) AS verifications,
  (SELECT count(*) FROM two_factor) AS two_factor_records,
  (SELECT count(*) FROM tasks) AS tasks;
```

Expected: every value is `0`. Stop and delete the development branch if any
production row is present, then recreate it explicitly as schema-only.

- [ ] **Step 4: Generate migration-ledger inserts from production**

Open the SQL Editor on `production` and run:

```sql
SELECT format(
  'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (%L, %s);',
  hash,
  created_at
)
FROM drizzle.__drizzle_migrations
ORDER BY id;
```

Copy only the generated `INSERT` statements. These rows are migration metadata,
not application data.

- [ ] **Step 5: Establish the development migration baseline**

Open the SQL Editor on `development` and execute the generated statements in
one transaction:

```sql
BEGIN;
TRUNCATE drizzle.__drizzle_migrations RESTART IDENTITY;
```

Execute the generated `INSERT` statements, then commit:

```sql
COMMIT;
```

Do not commit the generated statements to the repository because they describe
the current deployed state and can become stale.

- [ ] **Step 6: Compare the ledgers**

Run this query on both branches:

```sql
SELECT count(*) AS migration_count, max(created_at) AS latest_migration
FROM drizzle.__drizzle_migrations;
```

Expected: production and development return the same count and latest migration
timestamp before pending repository migrations are applied.

- [ ] **Step 7: Point local development at the development branch**

In KeePassXC:

1. Preserve the previous production value only in a restricted production
   record if operational recovery requires it.
2. Change `atemoya-app/DATABASE_URL`, which `.env.schema` resolves locally, to
   the development pooled connection string.
3. Keep `atemoya-app/BETTER_AUTH_URL` set to `http://localhost:3000`.
4. Generate a development-only Better Auth secret:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

5. Store the result as the local `atemoya-app/BETTER_AUTH_SECRET`.
6. Do not change the Vercel Production secret.

- [ ] **Step 8: Apply pending migrations to development**

With KeePassXC available, run:

```powershell
pnpm db:migrate
pnpm db:migrate
```

Expected: the first run applies only migrations newer than the copied baseline;
the second run exits successfully with no migrations applied.

- [ ] **Step 9: Seed synthetic data**

1. Start the local app with `pnpm dev`.
2. Create a dedicated development account using a controlled test mailbox.
3. Complete email verification through the normal application flow.
4. Add several synthetic active and completed tasks.
5. Do not use production email addresses, passwords, backup codes, or task text.
6. Stop the development server when verification is complete.

---

### Task 3: Route Vercel Preview and Production to Their Neon Branches

**Files:**

- No repository files change.

**Interfaces:**

- Consumes: branch-specific Neon connection strings and separate Better Auth
  secrets.
- Produces: Vercel environment scopes that select the correct Neon branch
  without runtime branching logic.

- [ ] **Step 1: Audit existing Vercel values**

In **Vercel Project Settings → Environment Variables**, inspect:

- `DATABASE_URL`;
- `BETTER_AUTH_SECRET`;
- any variables currently assigned to both Production and Preview.

Do not reveal values while reviewing their scopes.

- [ ] **Step 2: Configure production scope**

1. Ensure Production `DATABASE_URL` uses the `production` branch connection
   string.
2. Ensure Production `BETTER_AUTH_SECRET` retains the production-only secret.
3. Remove Production values from Preview or Development scope if one record
   currently spans multiple environments.

- [ ] **Step 3: Configure the `develop` Preview scope**

1. Add or update `DATABASE_URL` for the **Preview** environment.
2. Restrict it to Git branch `develop`.
3. Set it to the `development` branch pooled connection string.
4. Add or update `BETTER_AUTH_SECRET` for Preview branch `develop`.
5. Use the same development secret stored in KeePass so local and Preview can
   read authentication records in their shared development database.
6. Confirm that this development secret differs from Production.
7. Leave `BETTER_AUTH_URL` unset on Vercel so existing Vercel host derivation
   continues to work.

- [ ] **Step 4: Redeploy and verify `develop`**

Trigger a new deployment of `develop`; existing deployments do not receive
updated environment variables.

Using a synthetic account:

1. Create a uniquely named task in the deployed Preview.
2. Confirm it appears in Neon's `development.tasks`.
3. Confirm the same task does not appear in `production.tasks`.
4. Delete the test task from Preview.

- [ ] **Step 5: Verify production remains isolated**

1. Load the production application.
2. Confirm existing production tasks remain present.
3. Confirm the Preview-only account cannot sign in to production.
4. Do not create disposable records in production merely for this check.

---

### Task 4: Add the Explicit Migration Workflow

**Files:**

- Create: `.github/workflows/migrate-database.yml`

**Interfaces:**

- Consumes: GitHub Environments named `Preview` and `Production`, each with
  an environment-scoped `DATABASE_URL` secret.
- Produces: a manual `migrate-database` workflow that migrates one reviewed Git
  ref against one approved environment.

- [ ] **Step 1: Configure GitHub Environments manually**

In **GitHub Repository Settings → Environments**:

1. Reuse the existing `Preview` environment.
2. Add secret `DATABASE_URL` containing the Neon development connection string.
3. Reuse the existing `Production` environment.
4. Add secret `DATABASE_URL` containing the Neon production connection string.
5. Add required reviewers to `Production`.
6. Prevent self-review when the repository plan and team size permit it.
7. Leave `Preview` without a reviewer requirement.

If required-review protection is unavailable on the current GitHub plan, stop
and get explicit approval for a documented manual confirmation fallback before
implementing it.

- [ ] **Step 2: Create the workflow**

Create `.github/workflows/migrate-database.yml`:

```yaml
name: migrate-database

on:
  workflow_dispatch:
    inputs:
      target:
        description: Database environment
        required: true
        type: choice
        options:
          - Preview
          - Production
      ref:
        description: Exact ref; Production requires a full develop-ancestor SHA
        required: true
        type: string

permissions:
  contents: read

concurrency:
  group: migrate-database-${{ inputs.target }}
  cancel-in-progress: false

jobs:
  migrate:
    name: Migrate ${{ inputs.target }}
    runs-on: ubuntu-latest
    environment: ${{ inputs.target }}

    steps:
      - name: Check out migration source
        uses: actions/checkout@v4
        with:
          ref: ${{ inputs.ref }}
          fetch-depth: 0

      - name: Verify production source
        if: inputs.target == 'Production'
        shell: bash
        env:
          REQUESTED_REF: ${{ inputs.ref }}
        run: |
          if [[ ! "$REQUESTED_REF" =~ ^[0-9a-f]{40}$ ]]; then
            echo "Production migrations require a full lowercase commit SHA."
            exit 1
          fi

          CHECKED_OUT_SHA="$(git rev-parse HEAD)"
          if [[ "$CHECKED_OUT_SHA" != "$REQUESTED_REF" ]]; then
            echo "The checked-out commit does not match the requested SHA."
            exit 1
          fi

          git fetch origin develop --no-tags
          if ! git merge-base --is-ancestor "$CHECKED_OUT_SHA" origin/develop; then
            echo "Production migrations require a commit from current develop history."
            exit 1
          fi

      - name: Review migration source
        shell: bash
        run: |
          echo "Target: ${{ inputs.target }}"
          echo "Commit: $(git rev-parse HEAD)"
          git log -1 --format="Subject: %s"
          find drizzle -maxdepth 1 -type f -name "*.sql" -printf "%f\n" | sort

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24

      - name: Enable pnpm
        run: corepack enable

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Verify database secret
        shell: bash
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          if [[ -z "$DATABASE_URL" ]]; then
            echo "DATABASE_URL is not configured for this environment."
            exit 1
          fi

      - name: Apply Drizzle migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: pnpm exec drizzle-kit migrate
```

- [ ] **Step 3: Validate the workflow diff**

Run:

```powershell
pnpm format:check -- .github/workflows/migrate-database.yml
git diff --check
```

Expected: both commands exit successfully.

- [ ] **Step 4: Merge the workflow before relying on it**

GitHub exposes manually dispatched workflows from the repository's default
branch. Review and merge this infrastructure-only workflow through the normal
branch flow before using it to promote a later schema migration.

- [ ] **Step 5: Exercise development migration**

In **GitHub Actions → migrate-database → Run workflow**:

1. Select target `Preview`.
2. Enter the exact feature branch or commit containing the migration.
3. Run the workflow.
4. Confirm dependency installation and Drizzle migration succeed.
5. Run it a second time against the same ref.

Expected: the second execution succeeds without applying the migration again.

- [ ] **Step 6: Exercise the production guard without migrating**

Select target `Production` with a branch name or abbreviated SHA instead of a
full commit SHA.

Expected:

- GitHub requests Production environment approval;
- after approval, **Verify production source** fails;
- the Drizzle step never runs.

Production accepts only a full lowercase commit SHA that is an ancestor of the
current `develop` branch. The current commit is the normal choice. A reviewed
earlier ancestor is allowed only when an expand/contract rollout must apply its
additive and contract migrations in separate maintenance phases.

Do not run a production migration merely to test the successful path.

---

### Task 5: Document the Environment and Promotion Workflow

**Files:**

- Modify: `README.md`
- Modify: `docs/architecture/overview.md`
- Modify: `docs/state/current-status.md`
- Modify: `docs/state/recent-changes.md`
- Modify: `docs/state/next-steps.md`

**Interfaces:**

- Consumes: accepted ADR-013 and the working environment configuration.
- Produces: operator-facing setup, deployment, and recovery instructions.

- [ ] **Step 1: Update README environment setup**

Document:

- local `DATABASE_URL` always targets Neon `development`;
- Vercel Preview branch `develop` targets `development`;
- Vercel Production branch `main` targets `production`;
- local production credentials are intentionally unnecessary;
- migration commands must use the GitHub workflow after bootstrap;
- environment-variable changes require a new Vercel deployment.

Do not include actual project IDs, branch IDs, hosts, role names, or secrets.

- [ ] **Step 2: Update the architecture overview**

Add a short **Database Environments** section that links to ADR-013 and records:

```text
local + develop Preview -> Neon development
main Production         -> Neon production
```

State that migrations move development-first through the approved workflow and
never execute during the Vercel build.

- [ ] **Step 3: Sync project state**

- `current-status.md`: record the active two-branch database boundary and
  migration gate after manual acceptance succeeds.
- `recent-changes.md`: add one reverse-chronological entry explaining why the
  environment was split.
- `next-steps.md`: replace environment-setup work with any remaining deployment
  or monitoring action; leave unrelated open questions intact.

- [ ] **Step 4: Validate documentation**

Run:

```powershell
pnpm format:check -- README.md docs/architecture/overview.md docs/architecture/neon-environment-isolation-plan.md docs/decisions/ADR-013-use-neon-branches-for-environment-isolation.md docs/state/current-status.md docs/state/recent-changes.md docs/state/next-steps.md
git diff --check
```

Expected: both commands exit successfully.

---

### Task 6: Perform the First Controlled Promotion

**Files:**

- No repository files change unless verification exposes a defect.

**Interfaces:**

- Consumes: tested migration files, configured Neon branches, Vercel scopes, and
  the migration workflow.
- Produces: a production deployment whose schema was verified first in
  development.

- [ ] **Step 1: Migrate and accept development**

1. Run `migrate-database` with target `Preview` and the exact reviewed
   migration ref.
2. Deploy or redeploy `develop`.
3. Verify sign-up, email verification, sign-in, optional 2FA, task creation,
   editing, completion, restoration, ordering, deletion, and account deletion.
4. Check Neon to confirm every synthetic write landed on `development`.
5. Confirm no matching synthetic data exists on `production`.

- [ ] **Step 2: Record the production recovery point**

Immediately before production migration:

1. Open Neon's production branch history.
2. Record the current UTC timestamp and restore coverage in the private
   operational note.
3. Confirm no unrelated migration is running.
4. Do not proceed if the recovery point cannot be identified.

- [ ] **Step 3: Run the approved production migration**

In GitHub Actions:

1. Select target `Production`.
2. Set ref to `develop`.
3. Review the displayed commit SHA and pending migration files.
4. Approve the protected Production environment.
5. Confirm Drizzle exits successfully.
6. Do not rerun with a different ref after approval.

- [ ] **Step 4: Deploy the migrated code**

1. Merge `develop` into `main` through the existing pull-request flow.
2. Wait for the Vercel Production deployment to finish.
3. Confirm the deployment uses Production-scoped environment variables.

- [ ] **Step 5: Smoke-test production**

Using an existing production account:

- sign in;
- load the task list;
- create and remove one clearly identified smoke-test task only when production
  data mutation is acceptable;
- verify the feature associated with the promoted migration;
- confirm logs contain no database URL or password.

- [ ] **Step 6: Handle failure without automatic rollback**

If migration or smoke testing fails:

1. Stop promotion and do not merge or redeploy additional changes.
2. Preserve workflow and application logs without secrets.
3. Determine whether the failure is application-only or database-affecting.
4. For an application-only failure, redeploy the last known-good application
   only when its schema remains compatible.
5. For database corruption or incompatibility, create and verify a Neon recovery
   branch from the recorded pre-migration point.
6. Redirect production or restore data only after separate explicit approval.

---

### Task 7: Final Verification and Focused Commits

**Files:**

- Review all files changed by Tasks 4 and 5.

**Interfaces:**

- Consumes: completed implementation and manual acceptance evidence.
- Produces: reviewed commits containing no secrets or unrelated changes.

- [ ] **Step 1: Run repository checks**

Run:

```powershell
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
git diff --check
```

Expected: every command exits successfully.

- [ ] **Step 2: Perform the secret and scope review**

Review:

```powershell
git status --short
git diff
```

Confirm:

- no connection string, password, API key, project ID, branch ID, or private
  operational note is present;
- only the workflow and documentation files described by this plan changed;
- `vercel.json` still deploys only `main` and `develop`;
- no application code contains environment-selection branches.

- [ ] **Step 3: Prepare focused commits**

Prepare the documentation decision separately:

```text
docs: Record Neon environment isolation
```

Prepare the workflow and operator documentation as one operational change:

```text
chore: Add database migration promotion
```

When the implementation branch contains an uppercase task code, add that code
as the commit scope according to repository policy. Do not stage or commit
without explicit approval.
