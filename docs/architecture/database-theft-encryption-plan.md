# Database Theft Encryption Plan

## Status

Revised architecture ready for final review; implementation has not started.

## Architecture Review Findings

The 2026-07-30 repository review found that this plan is not implementation
ready. The following findings are requirements for the next revision, not
implementation tasks under the current design.

### Resolved

1. **Threat-model scope was resolved on 2026-07-31.** The design protects
   against passive database exfiltration and read-only database exposure.
   Active database writes, relationship manipulation, deletion, rollback, and
   application-oracle attacks are explicitly out of scope. A row-integrity
   authentication system is therefore not required by this ADR.
2. **Conversion and migration ownership were resolved on 2026-07-31.**
   Maintenance-only shadow columns preserve plaintext source values until full
   verification. Restartable row updates use the existing Neon HTTP client,
   while additive and contract schema changes remain in two reviewed Drizzle
   migrations. No database-wide interactive transaction or command-owned DDL
   is required.
3. **The Better Auth adapter architecture was resolved on 2026-07-31.** A thin
   decorator wraps the installed Better Auth 1.6.23 Drizzle adapter and
   preserves its complete operation contract, including joins, transactions,
   set-valued conditions, `consumeOne`, and `incrementOne`. Atomic methods
   delegate exactly once; the decorator never replaces them with
   find-then-write sequences.
4. **The maintenance write barrier was resolved on 2026-07-31.** A root Next.js
   Proxy returns `503` before page, Better Auth route, and Server Action
   execution. After the maintenance deployment receives the production alias,
   the operator waits longer than the confirmed maximum invocation duration,
   including `after()` work. Full source-to-shadow comparison then detects any
   late plaintext mutation before the contract migration can remove source
   columns.
5. **Normalization authority was resolved on 2026-07-31.** Versioned
   application normalizers define email, nickname, and task-title equality.
   Blind indexes and their unique constraints use those values. PostgreSQL
   `lower()` and database collation no longer participate after the contract
   migration.
6. **The no-plaintext logging policy was resolved on 2026-07-31.** Better Auth
   uses a custom logger that discards upstream messages and arguments. One
   application logger accepts only fixed event codes and typed allowlisted
   metadata. Raw errors, causes, SQL, parameters, request data, and protected
   values are never logged or rethrown across a framework boundary.
7. **Protected-field callers outside the adapter have a narrow path.** Nickname
   availability, nickname update, and trusted-device cleanup use dedicated
   blind-index helpers. No generic encrypted repository is introduced.
8. **The real-PostgreSQL test seam was resolved on 2026-07-31.** A dedicated
   `atemoya_test` database and `atemoya_test_owner` role live inside the Neon
   development branch. Explicit integration tests use `TEST_DATABASE_URL`,
   verify the exact database and role before writing, and never share tables
   with the development or Preview application.

### Complexity Audit

- Keep one cryptography module with fixed field mappings. Do not split envelope,
  key-provider, blind-index, and per-field classes into shallow modules.
- Prefer a decorator around the installed Better Auth Drizzle adapter over a
  from-scratch adapter, while preserving every atomic adapter operation.
- Do not add OAuth hooks, generic encrypted repositories, KMS interfaces, or
  provider abstractions before a real second implementation exists.
- Remove the create and update full-task-list duplicate scans when blind-index
  uniqueness becomes authoritative; retain the existing unique-violation error
  path.

### Conversion Decision

Use maintenance-only shadow columns. An additive Drizzle migration creates
temporary ciphertext and blind-index columns. While application writes are
blocked, a restartable command populates and verifies those columns without
modifying plaintext source values. A contract Drizzle migration switches to
the verified ciphertext, replaces constraints, and removes plaintext.

A dedicated transaction-capable client was rejected because preserving source
columns makes a database-wide interactive transaction unnecessary. Live
expand, backfill, and contract remains rejected because it introduces
mixed-read and dual-write behavior without a current uptime requirement.

## Context

Atemoya stores Better Auth identity and session records plus task data
in Neon PostgreSQL. Neon encrypts physical storage, but a logical database dump
or read-only database exposure can still reveal column values.

The selected threat model is passive database exfiltration: an attacker obtains
the PostgreSQL contents but cannot modify the database and does not also obtain
the application runtime secrets. Trusted Atemoya servers may decrypt data so
the current Server Component, Better Auth, and Resend flows can continue to
work.

## Goals

- Make sensitive user values unreadable in a stolen database.
- Preserve the current Next.js, Drizzle, Better Auth, and Resend behavior.
- Keep encryption and lookup keys outside Neon.
- Detect ciphertext modification or movement between records.
- Support a fully verified maintenance conversion and justified key rotation.
- Avoid adding a cryptography dependency when Node provides the required
  authenticated encryption and HMAC primitives.

## Non-goals

- End-to-end or zero-knowledge encryption.
- Protection after both the database and application secrets are compromised.
- Protection from active database writes, relationship manipulation, deletion,
  rollback, or application-oracle attacks.
- Hiding relational metadata such as row counts, timestamps, ownership, or task
  order.
- Encrypting opaque record IDs, foreign keys, booleans, timestamps, or numeric
  positions needed by PostgreSQL.
- Adding managed KMS, per-user data keys, searchable encryption, or online
  lookup-key rotation in the first release.
- Zero-downtime or dual-write production conversion.
- Encrypting dormant OAuth token columns before Atemoya supports OAuth.
- Building privileged production decryption or database-inspection tooling.

## Approaches Considered

### Versioned application keys

Use Node's built-in cryptography, with independent encryption and lookup keys
stored in the existing Varlock/KeePass and production server-secret systems.

This is the selected approach. It directly covers passive database
exfiltration, preserves the existing deployment model, and introduces no
dependency.

### Managed KMS with envelope encryption

Use a managed KMS key to wrap application or per-user data-encryption keys.

This provides stronger key controls and auditability, but adds an SDK, network
calls, deployment permissions, caching decisions, and operational cost. Adopt
it when compliance, multiple key administrators, or application-secret theft
enters the threat model.

### PostgreSQL `pgcrypto`

Encrypt and decrypt values inside PostgreSQL.

This is rejected because the decryption key reaches the database execution
layer, weakens separation between keys and data, and spreads encryption details
through SQL queries.

## Cryptographic Design

Use AES-256-GCM through Node's built-in `node:crypto` module:

- Each encryption uses a fresh cryptographically random 12-byte IV.
- Each value retains the full 16-byte authentication tag.
- Ciphertext is serialized as a versioned base64url envelope containing the key
  version, IV, tag, and encrypted bytes.
- Additional authenticated data binds the value to its model, field, and
  immutable record ID. Encryption happens only after the record ID exists.
- Decryption rejects unknown versions, malformed envelopes, incorrect tags,
  wrong keys, and values moved to another record or field.

Use a separate 32-byte HMAC-SHA-256 key for blind indexes. Never derive the
lookup key from or reuse the encryption key. Prefix each HMAC input with its
model, field, and normalization version. Include the owning user ID for task
titles so equality is scoped per user. Unkeyed hashes and deterministic
encryption are not acceptable substitutes.

Application normalization is the sole equality authority. The cryptography
module owns fixed, versioned lookup mappings:

- `email:v1` applies `trim().toLowerCase()`, matching the application's trimmed
  input and Better Auth's lowercase storage and lookup behavior.
- `nickname:v1` applies the existing `nicknameSchema`, which trims input and
  permits only lowercase ASCII letters, numbers, hyphens, and underscores.
- `task-title:v1` applies `trim().toLowerCase()` using JavaScript's standard
  Unicode case conversion and includes the owning user ID in the HMAC input.
- session tokens and verification identifiers use exact, case-sensitive values
  with no text normalization.

Do not use PostgreSQL `lower()`, locale-sensitive `toLocaleLowerCase()`, Unicode
normalization, accent folding, or broader case folding. Every lookup and write
uses the same mapping and includes its normalization version in the
domain-separated HMAC input.

Before conversion, run the application normalizers over every source row and
stop on:

- duplicate normalized email values
- duplicate normalized nickname values
- duplicate normalized task titles within one owning user

Report only stable row IDs and collision type, never the colliding plaintext or
blind index. A person resolves collisions before rerunning preflight; the
command never merges, renames, or deletes records automatically.

The server-only cryptography boundary validates all configured keys during
application startup. Missing keys, invalid base64, incorrect key lengths, or an
unknown active version prevent startup.

## Key Management

Each environment uses two independent versioned secrets:

- a data-encryption key
- a blind-index lookup key

Production has its own key pair. Local development and Vercel Preview share a
different development key pair because they use the same schema-only
development database branch. A development secret leak must not enable
production decryption.

KeePass is the sole recoverable source of truth for application encryption key
material. Varlock supplies local values, and Vercel receives environment-scoped
server-only copies. Keys must never be committed, stored in Neon, exposed
through `NEXT_PUBLIC_*`, or written to logs. `BETTER_AUTH_SECRET` remains an
independent Better Auth key and is not reused by the application encryption
module. The accepted tradeoff is that losing the KeePass vault makes protected
data permanently unreadable; no second recovery copy is maintained.

Ciphertext records carry their encryption-key version. Keys rotate only after
suspected exposure, relevant access changes, or a cryptographic or
configuration change; there is no calendar rotation. Encryption-key rotation
adds a new active version, writes new data with it, re-encrypts older records,
verifies the result, and retires the old key only after the Neon restore window
containing old ciphertext has expired.

Blind-index rotation is a separate maintenance operation because HMAC output is
irreversible and participates in unique lookups. Pause all writes, recompute
every blind index under the new lookup key, verify uniqueness, switch versions,
and then resume service. Online dual-index rotation should be added only if
uptime requirements justify its extra schema and race-handling complexity.

Loss of the active and retained decryption keys means permanent data loss.
Vercel deployment secrets are operational copies, not key backups.

## Data Classification

### Encrypt

- `tasks.title`
- `user.name`
- `user.email`
- `user.image` when present
- `session.token`
- `session.ip_address`
- `session.user_agent`
- `verification.identifier`
- `verification.value`

### Blind-index when queried by equality

- normalized user email
- normalized nickname
- normalized task title, scoped by owning user ID
- session token
- verification identifier

Unique constraints move from randomized ciphertext to the corresponding blind
index. Task titles use a unique `(user_id, title_lookup)` constraint so the
existing case-insensitive, per-user uniqueness rule continues across active and
completed tasks. Lookup-key rotation occurs only during maintenance, so a
single active lookup version owns uniqueness at any moment.

The contract migration removes the PostgreSQL `lower(title)` index. Blind-index
constraints become the only database uniqueness authority for protected
values. Once those constraints are active, remove the task create and update
full-list duplicate scans and retain the existing unique-violation error
mapping.

### Better Auth-owned protection

Better Auth credential passwords remain one-way `scrypt` hashes. They are never
decrypted or included in the general encryption format. A database thief can
still attempt offline password guessing, so encryption does not replace strong
passwords or Better Auth's memory-hard password hashing.

Better Auth continues to own encryption for:

- `two_factor.secret`, which the installed TOTP plugin already encrypts with
  `BETTER_AUTH_SECRET`
- `two_factor.backup_codes`, after setting
  `backupCodeOptions.storeBackupCodes` to `encrypted`

The production conversion detects the existing backup-code representation,
encrypts any plaintext JSON code sets with `BETTER_AUTH_SECRET`, and verifies
that Better Auth can decode every converted set. Do not double-encrypt either
field in the application adapter.

The app currently has no OAuth provider. Preflight verifies that
`account.access_token`, `account.refresh_token`, and `account.id_token` are
empty. The first release adds no speculative handling for them. Enabling OAuth
later requires a separate review and Better Auth token-encryption
configuration before any provider is activated.

### Leave readable

- opaque primary IDs and foreign keys
- provider type
- credential account IDs when they duplicate opaque application user IDs
- email-verification state
- `verification.purpose` and nullable `verification.subject_user_id`
- two-factor enabled, verified, failure-count, and lockout state
- creation, update, expiry, and task change timestamps
- task position

These values expose metadata but not user-authored content. Hiding that metadata
would require a different storage model and is outside the selected threat
model.

## Application Boundaries

One server-only cryptography module owns envelope validation, encryption,
decryption, blind-index calculation, and key selection. Callers do not handle
raw keys or implement cryptographic formatting.

Task encryption stays in the existing database query boundary. Create and
update operations encrypt `title` before interpolation or Drizzle writes;
list and returning operations decrypt before producing the existing
`Task` DTO. Ordering continues to use readable IDs, positions, and
timestamps.

Better Auth identity, session, and verification encryption uses a decorator
around the installed Drizzle adapter. The decorator transforms:

- create and update data into ciphertext and blind indexes
- equality conditions into blind-index conditions
- database output back into the logical values Better Auth expects

The decorator wraps the adapter factory result rather than implementing a new
database adapter. Unknown models and unprotected fields pass through unchanged.
`createSchema`, adapter metadata, model mapping, selection, pagination, joins,
and sorting retain the base adapter behavior unless a protected field requires
the explicit handling below.

### Better Auth Adapter Contract

The contract is verified against Better Auth 1.6.23. An upgrade that changes
the adapter interface requires review and contract-test updates before
deployment.

- `create`, `update`, and `updateMany` encrypt protected write values and
  calculate their blind indexes before one call to the base operation.
- `findOne` and `findMany` rewrite protected lookup conditions, preserve
  selection, pagination, joins, and unprotected sorting, then decrypt the main
  model and known joined model results.
- `count`, `delete`, and `deleteMany` rewrite lookup conditions and return the
  base operation result unchanged.
- `consumeOne` rewrites its conditions, calls the base atomic delete-and-return
  operation exactly once, and decrypts the returned row.
- `incrementOne` rewrites its selector and guard conditions, transforms any
  protected values in its atomic `set` map, calls the base guarded update
  exactly once, and decrypts the returned row. Protected text fields are never
  increment targets.
- `transaction` delegates to the base adapter and decorates the transaction
  adapter supplied to its callback so encrypted operations cannot bypass the
  boundary.
- `createSchema`, adapter `id`, and adapter `options` pass through unchanged.

For blind-indexed protected fields, `eq`, `ne`, `in`, and `not_in` conditions
rewrite to the corresponding lookup column while preserving connectors.
Scalar and array values use the field's canonical normalizer before HMAC.
Ordered and pattern operators (`lt`, `lte`, `gt`, `gte`, `contains`,
`starts_with`, and `ends_with`), lookup modes that conflict with the field's
canonical normalizer, and sorting on protected fields fail closed with a
non-plaintext diagnostic because randomized ciphertext cannot support them.
Existing prefix-based verification cleanup moves to readable `purpose` and
`subject_user_id` metadata before encryption.

The decorator does not add fallback find-then-write behavior. Better Auth's
native Drizzle `consumeOne` and `incrementOne` implementations remain
authoritative so verification consumption and two-factor counters retain their
race guarantees.

The verification adapter also derives readable operational metadata:

- `purpose` identifies records such as `trust-device`, two-factor challenge,
  attempt counter, email verification, and password reset
- `subject_user_id` stores the owning opaque user ID when the flow supplies one

Password reset revokes trusted-device grants by indexed `purpose` and
`subject_user_id` conditions. It never decrypts and scans the verification
table or relies on a ciphertext prefix query.

Database hooks alone are insufficient for email, nickname, session, and
verification fields because they do not consistently transform query
conditions. Narrow hooks remain acceptable for future token fields that are
never queried by their plaintext value.

Decrypted values stay inside server-only modules until an existing application
flow needs them. Server Components and actions receive only their current
minimal DTOs. Resend still receives the plaintext email required to deliver a
message; database encryption does not make third-party processing
zero-knowledge.

## Write And Read Flow

Sensitive writes follow this order:

1. Validate the plaintext with existing Zod or Better Auth rules.
2. Normalize equality-lookup values with the field's existing rule.
3. Compute required blind indexes.
4. Encrypt the original logical values.
5. Persist ciphertext and indexes atomically.

Sensitive reads follow this order:

1. Normalize an equality lookup and compute its blind index.
2. Query the blind-index column.
3. Authenticate and decrypt the matched values inside the server boundary.
4. Return only the logical fields required by the existing caller.

No plaintext user value is included in query logging, error context, migration
progress, analytics, or server diagnostics.

## Logging Policy

Use one small server-only structured logger with a closed event-code union and
typed allowlisted fields. It may emit:

- fixed event code and severity
- operation or conversion phase
- model and field names
- stable record ID
- encryption-key version
- row counts
- classified error category, PostgreSQL SQLSTATE, or constraint name

It must reject additional fields at compile time. Never pass it a raw `Error`,
`cause`, stack, arbitrary message, SQL query, query parameters, request body,
headers, cookies, plaintext, key material, blind index, or full ciphertext.
Do not use regex or value-based redaction as the primary control; unknown
sensitive values cannot be redacted reliably.

Configure Better Auth 1.6.23 with warning-level logging and a custom `log`
function. The function ignores Better Auth's message and argument parameters
and emits only a fixed `better_auth_event` code plus the supplied severity.
This suppresses the installed duplicate-email info message and prevents future
upstream messages from entering application logs.

Task queries, the Better Auth adapter decorator, cryptography operations, and
the conversion command catch raw failures at their owning boundary. They
classify known cases such as uniqueness conflict, malformed envelope,
authentication failure, unknown key version, and database availability. They
then log allowlisted metadata and return or throw a new sanitized application
error without attaching the original failure as `cause`. Next.js and Vercel
therefore receive only the sanitized error.

Startup key validation may name the missing environment variable, expected key
length, and key version, but never the configured value. User-facing responses
remain generic. The conversion command prints only phases, counts, stable IDs,
and fixed error categories.

Captured-log tests place unique marker strings in email, nickname, task title,
session token, verification data, keys, blind indexes, and ciphertext. The
tests exercise successful and failing auth, duplicate constraints, malformed
ciphertext, database failure, and interrupted conversion, then assert that no
marker, SQL parameter, key, index, or envelope appears in captured stdout or
stderr.

## Integration Test Environment

Keep the existing two Neon branches. Inside the `development` branch, create:

- database `atemoya_test`
- login role `atemoya_test_owner`, owning only `atemoya_test`

Use the Neon Console for the one-time setup:

1. Open the Atemoya project and select the `development` branch.
2. Create role `atemoya_test_owner` and retain its generated password only in
   KeePass.
3. Create database `atemoya_test` with `atemoya_test_owner` as owner.
4. Generate its pooled connection string and store it as
   `atemoya-app/TEST_DATABASE_URL` in KeePass.
5. Do not add this value to Vercel, GitHub Actions, `.env` files, or command
   history.

Implementation adds `TEST_DATABASE_URL` to `.env.schema` for local Varlock
resolution only. The application runtime and migration workflow continue to
use `DATABASE_URL`; there is no fallback between the two variables.

Before applying migrations, seeding, truncating, or testing, the integration
harness queries:

```sql
SELECT current_database() AS database_name, current_user AS role_name;
```

It proceeds only when the values are exactly `atemoya_test` and
`atemoya_test_owner`. A missing URL or mismatch stops without writes. Cleanup
may truncate known application tables only after the same guard passes; it
never drops a database or schema.

Add an explicit `pnpm test:integration` command that runs serially against the
real Neon HTTP and Drizzle path. It applies the canonical Drizzle migrations,
uses synthetic marker data, resets only the dedicated database, and fails when
`TEST_DATABASE_URL` is unavailable. The existing `pnpm test` remains the fast,
database-free unit suite.

Integration coverage includes the encrypted task boundary, the complete Better
Auth adapter decorator contract, unique blind indexes, atomic `consumeOne` and
`incrementOne`, maintenance gating, conversion restart and verification,
contract-migration rollback, and captured-log assertions. Production data and
production encryption keys are never used.

## Maintenance Write Barrier

Add one root `proxy.ts` maintenance gate controlled by
`MAINTENANCE_MODE=1`. The gate runs before application routes and returns a
plain `503 Service Unavailable` response with `Cache-Control: no-store` and a
`Retry-After` header. Its static matcher covers:

- all rendered application pages
- `/api/auth/:path*`
- POST requests that invoke Server Actions on their owning page routes

Only framework static assets, image optimization, and public static files are
excluded. There is no database-backed bypass or public health route. The
trusted local conversion command connects directly to Neon and does not pass
through the application gate.

The gate-aware release is deployed with maintenance disabled before production
conversion. To activate it, set the Production-scoped environment variable and
complete a new Vercel deployment so the production alias points to the gated
release. Confirm that representative page GET, Better Auth POST, and Server
Action POST requests all return `503` without database access.

After alias cutover, wait longer than the maximum execution duration configured
or imposed for every application route. This drain includes work registered
through Next.js `after()`, which can keep an invocation alive until that limit.
Record the confirmed limit and drain timestamps in the private rollout record;
do not hard-code an assumed Vercel default into the conversion command.

The conversion's final global verification decrypts each shadow value and
compares it with its unchanged plaintext source, recomputes every blind index,
and confirms row counts. A write that survives the drain therefore blocks the
contract migration instead of producing mixed or stale ciphertext. Keep
maintenance enabled and restart verification after any mismatch.

The implementation must test the Proxy matcher through Next.js's Proxy testing
utilities and exercise page, auth, and Server Action requests. An integration
test starts a delayed mutation before gate activation, completes the drain, and
proves that conversion cannot proceed until source and shadow values agree.

## Migration

Use an immediate shadow-column conversion during a production maintenance
window. There is no application dual-write or mixed-read production phase.

### Development preparation

1. Create an additive Drizzle migration that adds nullable shadow ciphertext
   and blind-index columns plus `verification.purpose` and
   `verification.subject_user_id`. Existing plaintext columns remain
   authoritative until the contract migration.
2. Implement the server-only cryptography boundary, task query changes, Better
   Auth Drizzle adapter decorator, encrypted backup-code configuration,
   maintenance gate, and one-time conversion command.
3. Use deterministic test keys only in tests. Configure separate development
   keys through KeePass/Varlock and Vercel Preview.
4. Rehearse the complete conversion against synthetic development data.
5. Preflight production read-only checks for normalized collisions, unexpected
   nulls, unsupported values, and any populated dormant OAuth token columns.
   Abort without writes if any check fails.
6. Create a contract Drizzle migration that replaces plaintext columns with
   their verified ciphertext shadows, installs blind-index constraints, and
   makes required columns non-null. The conversion command contains no DDL.

### Production conversion

1. Confirm Neon still provides the accepted 6-hour restore window and record
   the production restore timestamp. Do not create a second full-data database
   branch.
2. Confirm the production encryption and lookup keys exist in KeePass and as
   Vercel Production secrets. Configure the encrypted Better Auth backup-code
   behavior.
3. Predeploy the gate-aware release, apply the reviewed additive Drizzle
   migration, activate the Production maintenance deployment, verify page,
   auth, and Server Action `503` responses, and complete the recorded drain
   window.
4. From the trusted local machine, run the one-time conversion command with an
   explicitly confirmed production connection and keys loaded from KeePass.
   Do not copy application encryption keys into GitHub Actions.
5. Read rows in stable batches. For each row whose shadow values are missing,
   encrypt from the unchanged plaintext source and atomically write its
   ciphertext, blind indexes, and verification metadata. Read back and verify
   each batch before continuing. Existing non-null verified shadows make the
   command restartable after interruption.
6. Convert plaintext backup-code sets to Better Auth ciphertext in their
   shadows and verify that Better Auth decodes every converted set.
7. Run a global read-only verification: every protected value decrypts with
   the expected AAD, every blind index recomputes exactly, uniqueness holds,
   row counts are unchanged, and every source row has a verified shadow.
8. Apply the reviewed contract Drizzle migration only after global verification
   passes. It replaces plaintext columns with verified ciphertext, installs
   blind-index constraints, and makes required columns non-null.
9. Deploy the encrypted application while maintenance remains enabled, then
   disable maintenance and run focused production smoke checks.
10. If verification fails before the contract migration, leave maintenance
    enabled, correct the issue, and resume from the verified shadows; plaintext
    remains unchanged. If verification fails after the contract migration,
    restore the recorded Neon point and redeploy the previous application
    version.
11. Treat database-theft encryption as complete only after the production
    smoke checks pass and Neon's 6-hour restore history containing plaintext
    has expired.

The command requires an explicit environment and typed production
confirmation. It records only stable IDs, counts, phases, and error types; it
never logs plaintext, keys, blind indexes, or full ciphertext. The temporary
production connection is removed from the local environment after the
maintenance operation.

## Failure Handling

- Authentication-tag, context, or envelope failure stops the request.
- Corrupted ciphertext is never returned, silently skipped, or overwritten.
- User-facing responses remain generic.
- Operational logs may include a stable record ID, model, field, and key
  version, but never plaintext, keys, blind indexes, or full ciphertext.
- Conversion failures preserve every plaintext source value and leave verified
  shadow rows available for a restart.
- The contract migration runs only after global verification and uses the
  normal transactional Drizzle migration path.
- Database writes containing ciphertext and blind indexes are atomic.

## Verification

Focused cryptography tests cover:

- round-trip encryption and decryption
- different ciphertext for repeated encryption of the same plaintext
- tamper, wrong-key, wrong-record, and wrong-field rejection
- malformed envelopes and unknown versions
- stable domain-separated blind indexes
- exact `email:v1`, `nickname:v1`, and `task-title:v1` behavior, including
  whitespace, ASCII case, and representative Unicode task titles

Application tests cover:

- task create, list, update, reorder, and delete
- case-insensitive per-user task-title duplicate rejection
- sign-up, email verification, sign-in, and sign-out
- duplicate email and nickname rejection
- nickname update and account deletion
- session creation, lookup, expiry, and revocation
- password-reset revocation of trusted-device verification records
- TOTP and encrypted backup-code enrollment, verification, regeneration, and
  recovery

Migration checks cover:

- application-normalizer collision and dormant OAuth-token preflight
- restart after an injected partial conversion failure without source changes
- unchanged ownership, order, timestamps, and row counts
- full decryptability and blind-index recomputation before the contract
  migration
- transactional rollback of an injected contract-migration failure
- Better Auth decoding of every converted backup-code set
- maintenance-mode blocking of page, auth, and server-action database access
- drain coverage for delayed work registered through Next.js `after()`
- rejection of a source-to-shadow mismatch caused by an injected late write
- encryption-key rotation
- maintenance-mode blind-index rotation
- Neon point-in-time restoration with the previous application release

Finally, inspect representative database rows and run captured-log assertions
to confirm that sensitive plaintext is absent. Do not build an admin decryption
utility for this inspection; production SQL support intentionally sees
ciphertext.

## Consequences

- A passively exfiltrated Neon database no longer reveals user-authored values,
  identity values, session secrets, or verification contents.
- The application server can still decrypt data, which preserves the current
  product architecture.
- Database metadata remains visible.
- The Better Auth Drizzle adapter decorator becomes security-critical and needs
  focused integration coverage.
- KeePass loss is unrecoverable, while key compromise exposes every value
  protected by that key.
- Development and production key compromise have separate blast radii.
- Production conversion requires a controlled maintenance window and trusted
  local operator access.
- Neon SQL cannot directly inspect protected values, and the first release has
  no privileged decryption tool.
- Password hashes remain subject to offline guessing; they are intentionally
  hashed rather than reversibly encrypted.
- Managed KMS and per-user keys remain a future upgrade rather than first-release
  infrastructure.

## References

- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Node.js Crypto documentation](https://nodejs.org/api/crypto.html)
- [Neon security overview](https://neon.com/docs/security/security-overview)
- [Better Auth security](https://better-auth.com/docs/reference/security)
- [Better Auth custom database adapter guide](https://better-auth.com/docs/guides/create-a-db-adapter)
