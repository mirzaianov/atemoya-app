# Database Theft Encryption Plan

## Status

Accepted; implementation has not started.

## Context

Atemoya stores Better Auth identity and session records plus task data
in Neon PostgreSQL. Neon encrypts physical storage, but a logical database dump
or leaked database credentials can still expose column values.

The selected threat model is a database-only compromise: an attacker obtains
the PostgreSQL contents without also obtaining the application runtime secrets.
Trusted Atemoya servers may decrypt data so the current Server Component,
Better Auth, and Resend flows can continue to work.

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

This is the selected approach. It directly covers the database-only threat,
preserves the existing deployment model, and introduces no dependency.

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

Preserve the current normalization behavior:

- email uses Better Auth's trimmed, lowercase representation
- nickname uses the existing trimmed, lowercase ASCII validation
- task title uses the existing trimmed, lowercase comparison

Do not introduce Unicode normalization or broader case folding during this
migration. Preflight checks stop on any normalized collision so a person can
resolve it without automatic merging, renaming, or deletion.

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

Better Auth identity, session, and verification encryption uses a custom
database adapter. The adapter transforms:

- create and update data into ciphertext and blind indexes
- equality conditions into blind-index conditions
- database output back into the logical values Better Auth expects

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

## Migration

Use an immediate in-place conversion during a production maintenance window.
There is no dual-write or mixed-row production phase.

### Development preparation

1. Add nullable blind-index columns plus `verification.purpose` and
   `verification.subject_user_id` through the normal development-first Drizzle
   workflow. Existing protected text columns remain in place because PostgreSQL
   `text` can store the versioned ciphertext envelopes.
2. Implement the server-only cryptography boundary, task query changes, custom
   Better Auth adapter, encrypted backup-code configuration, maintenance gate,
   and one-time conversion command.
3. Use deterministic test keys only in tests. Configure separate development
   keys through KeePass/Varlock and Vercel Preview.
4. Rehearse the complete conversion against synthetic development data.
5. Preflight production read-only checks for normalized collisions, unexpected
   nulls, unsupported values, and any populated dormant OAuth token columns.
   Abort without writes if any check fails.

### Production conversion

1. Confirm Neon still provides the accepted 6-hour restore window and record
   the production restore timestamp. Do not create a second full-data database
   branch.
2. Confirm the production encryption and lookup keys exist in KeePass and as
   Vercel Production secrets. Configure the encrypted Better Auth backup-code
   behavior.
3. Apply the reviewed additive schema migration to production.
4. Enable the application maintenance gate. It returns a controlled `503`
   response and blocks page, auth, and server-action database access.
5. From the trusted local machine, run the one-time conversion command with an
   explicitly confirmed production connection and keys loaded from KeePass.
   Do not copy application encryption keys into GitHub Actions.
6. Inside one database transaction, replace protected plaintext column values
   in place with ciphertext, populate blind indexes and verification metadata,
   convert plaintext backup-code sets to Better Auth ciphertext, replace
   plaintext unique constraints with blind-index constraints, and make required
   blind-index columns non-null.
7. Before committing, verify every protected value decrypts with the expected
   AAD, every blind index recomputes exactly, every converted backup-code set
   decodes through Better Auth, uniqueness holds, row counts are unchanged, and
   no protected plaintext remains.
8. Commit only after the full verification succeeds. Any conversion or
   verification failure rolls back the transaction and leaves maintenance mode
   enabled.
9. Deploy the encrypted application while maintenance mode remains enabled,
   then disable maintenance and run focused production smoke checks.
10. If post-commit verification fails, re-enable maintenance, restore the
    recorded Neon point, and redeploy the previous application version. Writes
    remain blocked throughout the conversion, so this rollback does not discard
    accepted in-window user changes.
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
- Conversion failures roll back the transaction and preserve every source
  value.
- Database writes containing ciphertext and blind indexes are atomic.

## Verification

Focused cryptography tests cover:

- round-trip encryption and decryption
- different ciphertext for repeated encryption of the same plaintext
- tamper, wrong-key, wrong-record, and wrong-field rejection
- malformed envelopes and unknown versions
- stable domain-separated blind indexes
- current email, nickname, and task-title normalization

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

- read-only collision and dormant OAuth-token preflight
- complete transactional rollback on an injected conversion failure
- unchanged ownership, order, timestamps, and row counts
- full decryptability and blind-index recomputation before commit
- Better Auth decoding of every converted backup-code set
- maintenance-mode blocking of page, auth, and server-action database access
- encryption-key rotation
- maintenance-mode blind-index rotation
- Neon point-in-time restoration with the previous application release

Finally, inspect representative database rows and captured application logs to
confirm that sensitive plaintext is absent. Do not build an admin decryption
utility for this inspection; production SQL support intentionally sees
ciphertext.

## Consequences

- A stolen Neon database no longer reveals user-authored values, identity
  values, session secrets, or verification contents.
- The application server can still decrypt data, which preserves the current
  product architecture.
- Database metadata remains visible.
- A custom Better Auth adapter becomes security-critical and needs focused
  integration coverage.
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
