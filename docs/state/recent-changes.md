# Recent Changes

Status: project-state recent implementation and documentation history

Keep only the 10 most recent entries.

## Recent Changes

- 2026-08-02: Completed the maintenance-gated Neon development rehearsal: Preview page/auth/POST checks returned `503`, the 70-second drain completed, eight rows converted, ten scope rows verified, the rerun wrote zero rows, all aggregate shadows were complete, the encrypted task lifecycle passed, and production isolation/smoke checks remained clean. [Reason why added: establishes development acceptance before drafting the contract migration.]

- 2026-08-02: Added and verified the local `pnpm data:convert` operator with exact target confirmations, Varlock-only secrets, guarded test-database identity, non-test `APP_ENV` checks, deterministic interruption and concurrent-source injection, and captured-output secrecy. [Reason why added: completes the conversion command and failure boundary without touching development, Preview, or production data.]

- 2026-08-02: Added and verified restartable atomic conversion batches with stable cursors, source/shadow guards, rollback assertions, encrypted Better Auth backup-code conversion, per-batch readback, final global verification, and idempotent reruns. [Reason why added: completes the write engine only against guarded `atemoya_test` without exposing an operator command or modifying deployed databases.]

- 2026-08-02: Added and verified the read-only conversion preflight with exact target confirmations, stable scans, normalized-collision and OAuth-token checks, pending/complete shadow validation, Better Auth-owned value decoding, late-write mismatch detection, and sanitized events. [Reason why added: establishes the fail-closed gate for conversion writes without converting or modifying any application row.]

- 2026-08-02: Added and verified a root Next.js maintenance Proxy controlled only by `MAINTENANCE_MODE=1`, with plain no-store `503` responses for pages, Better Auth, and Server Actions plus static-asset exclusions and a default-off environment contract. [Reason why added: establishes the application write barrier required before conversion while leaving Preview, production, and Neon untouched.]

- 2026-08-02: Enabled Better Auth-native encrypted backup-code storage and verified ciphertext persistence, regeneration, rejection of superseded codes, one-time recovery consumption, and captured-log secrecy against the guarded integration database. [Reason why added: completes encrypted storage for newly issued backup codes without double encryption, deployment, or conversion of existing plaintext sets.]

- 2026-07-31: Implemented and verified a thin encryption decorator around Better Auth 1.6.23's Drizzle adapter, including protected writes and lookups, selected/joined decryption, verification metadata, fail-closed unsupported operations, native atomic delegation, transaction decoration, and indexed trusted-device cleanup. [Reason why added: completes encrypted identity, session, and verification persistence in isolation while keeping the runtime off Preview until conversion readiness.]

- 2026-07-31: Implemented and verified ciphertext-only task-title writes, record-bound decryption through a narrow DTO, per-user blind-index duplicate checks, sanitized task-query failures, and the complete guarded encrypted task lifecycle. [Reason why added: completes the first encrypted application persistence boundary while keeping it off Preview until development conversion is ready.]

- 2026-07-31: Applied additive migration `0008_productive_paibok.sql` to the Neon development application database, verified journal timestamp `1785509374785`, all 22 nullable-column and 10 index definitions, and the plaintext-authoritative Preview create/read/delete path. [Reason why added: completes development schema promotion while confirming production and encrypted persistence remain untouched.]

- 2026-07-31: Added and verified the ADR-009 four-variable development-key boundary, fail-closed database startup validation, KeePass-backed independent version-one keyrings, and matching Vercel Preview configuration; production keys remain absent. [Reason why added: completes development key provisioning before the additive migration reaches the application development database.]
