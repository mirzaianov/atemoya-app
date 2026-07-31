# Recent Changes

Status: project-state recent implementation and documentation history

Keep only the 10 most recent entries.

## Recent Changes

- 2026-07-31: Implemented and verified ciphertext-only task-title writes, record-bound decryption through a narrow DTO, per-user blind-index duplicate checks, sanitized task-query failures, and the complete guarded encrypted task lifecycle. [Reason why added: completes the first encrypted application persistence boundary while keeping it off Preview until development conversion is ready.]

- 2026-07-31: Applied additive migration `0008_productive_paibok.sql` to the Neon development application database, verified journal timestamp `1785509374785`, all 22 nullable-column and 10 index definitions, and the plaintext-authoritative Preview create/read/delete path. [Reason why added: completes development schema promotion while confirming production and encrypted persistence remain untouched.]

- 2026-07-31: Added and verified the ADR-009 four-variable development-key boundary, fail-closed database startup validation, KeePass-backed independent version-one keyrings, and matching Vercel Preview configuration; production keys remain absent. [Reason why added: completes development key provisioning before the additive migration reaches the application development database.]

- 2026-07-31: Generated and verified additive Drizzle migration `0008_productive_paibok.sql` with nullable encryption shadows, verification metadata, retained plaintext constraints, and partial lookup indexes; guarded Neon catalog, plaintext-write, shadow-write, and reset checks pass. [Reason why added: establishes the schema needed for encrypted persistence without deploying encrypted writes or converting application data.]

- 2026-07-31: Added a strict structured security logger, configured Better Auth 1.6.23 for warning-level fixed-event output, and verified that upstream messages, arguments, and raw errors cannot leak representative sensitive markers to stdout or stderr. [Reason why added: establishes the no-plaintext logging boundary before encrypted persistence and conversion code begins.]

- 2026-07-31: Added and verified the ADR-009 database-free cryptography boundary with versioned AES-256-GCM envelopes, record-bound authenticated data, independent HMAC-SHA-256 blind indexes, approved normalizers, strict key validation, and sanitized failures. [Reason why added: completes the cryptographic foundation before any environment, schema, or persistence integration.]

- 2026-07-31: Added and verified the ADR-009 test-only Neon/Drizzle harness, explicit `TEST_DATABASE_URL` contract, exact `atemoya_test`/`atemoya_test_owner` write guards, known-table cleanup, and separate unit and integration commands; the live migration/insert/reset test passes. [Reason why added: starts encryption implementation with a proven fail-closed real-driver boundary while leaving every encryption change pending explicit follow-up.]

- 2026-07-31: Approved the revised ADR-009 architecture and consolidated its implementation sequence, manual checkpoints, development rehearsal, rollback boundaries, and separate production approval gate in the existing architecture plan. [Reason why added: keeps the encryption decision and execution guidance in the repository's canonical ADR and architecture documents without adding a redundant documentation hierarchy.]

- 2026-07-31: Selected an isolated `atemoya_test` database and `atemoya_test_owner` role inside the Neon development branch for explicit real-driver integration tests. [Reason why added: resolves the final architecture-review blocker without adding another branch or touching Preview data.]

- 2026-07-31: Selected strict allowlist logging that discards Better Auth messages and raw application, database, and cryptography errors while retaining fixed event codes and safe operational metadata. [Reason why added: resolves plaintext-log leakage without relying on incomplete pattern redaction.]
