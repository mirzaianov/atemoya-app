# Recent Changes

Status: project-state recent implementation and documentation history

Keep only the 10 most recent entries.

## Recent Changes

- 2026-07-31: Added and verified the ADR-009 database-free cryptography boundary with versioned AES-256-GCM envelopes, record-bound authenticated data, independent HMAC-SHA-256 blind indexes, approved normalizers, strict key validation, and sanitized failures. [Reason why added: completes the cryptographic foundation before any environment, schema, or persistence integration.]

- 2026-07-31: Added and verified the ADR-009 test-only Neon/Drizzle harness, explicit `TEST_DATABASE_URL` contract, exact `atemoya_test`/`atemoya_test_owner` write guards, known-table cleanup, and separate unit and integration commands; the live migration/insert/reset test passes. [Reason why added: starts encryption implementation with a proven fail-closed real-driver boundary while leaving every encryption change pending explicit follow-up.]

- 2026-07-31: Approved the revised ADR-009 architecture and consolidated its implementation sequence, manual checkpoints, development rehearsal, rollback boundaries, and separate production approval gate in the existing architecture plan. [Reason why added: keeps the encryption decision and execution guidance in the repository's canonical ADR and architecture documents without adding a redundant documentation hierarchy.]

- 2026-07-31: Selected an isolated `atemoya_test` database and `atemoya_test_owner` role inside the Neon development branch for explicit real-driver integration tests. [Reason why added: resolves the final architecture-review blocker without adding another branch or touching Preview data.]

- 2026-07-31: Selected strict allowlist logging that discards Better Auth messages and raw application, database, and cryptography errors while retaining fixed event codes and safe operational metadata. [Reason why added: resolves plaintext-log leakage without relying on incomplete pattern redaction.]

- 2026-07-31: Selected versioned application normalizers as the sole equality authority for encrypted email, nickname, and per-user task titles, replacing PostgreSQL `lower()` uniqueness after conversion. [Reason why added: resolves the JavaScript/PostgreSQL normalization conflict and makes blind-index behavior deterministic.]

- 2026-07-31: Selected a root Next.js Proxy maintenance gate, a drain based on the confirmed platform execution limit, and source-to-shadow verification before plaintext removal. [Reason why added: resolves the late-write barrier without introducing separate database roles while accounting for Server Actions and `after()` work.]

- 2026-07-31: Selected a thin decorator around Better Auth 1.6.23's Drizzle adapter, preserving joins, transactions, set-valued conditions, and native `consumeOne` and `incrementOne` operations. [Reason why added: resolves the adapter-contract blocker without reimplementing Better Auth database behavior or weakening atomic security operations.]

- 2026-07-31: Selected maintenance-only shadow columns for ADR-009 conversion, with restartable data writes and additive and contract schema changes owned by reviewed Drizzle migrations. [Reason why added: resolves the unsupported interactive-transaction and migration-history blockers without adding another database client or a live dual-write path.]

- 2026-07-31: Narrowed ADR-009 to passive database exfiltration and read-only database exposure; active database writes, relationship manipulation, deletion, rollback, and application-oracle attacks are explicitly out of scope. [Reason why added: resolves the first architecture-review blocker without introducing a row-integrity system.]
