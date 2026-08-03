# Recent Changes

Status: project-state recent implementation and documentation history

Keep only the 10 most recent entries.

## Recent Changes

- 2026-08-03: Revised the protected production migration guard to require a full commit SHA from current `develop` history, allowing additive migration `0008` and contract migration `0009` to be promoted separately without permitting feature branches or unrelated refs. [Reason why added: resolves the production rollout conflict between strict branch flow and the approved expand/contract conversion sequence.]

- 2026-08-03: Split local Varlock references into explicit `.env.dev` and `.env.prod` files, removed required database and encryption defaults from `.env.schema`, completed independent production key provisioning in KeePass and Vercel Production, verified both database identities, proved missing production configuration fails closed, and accepted the merged Preview through sign-in plus an isolated encrypted task write and deletion. [Reason why added: prevents a production operator command from silently inheriting development credentials when its environment file is absent.]

- 2026-08-03: Completed the development application contract rehearsal under Preview maintenance: all endpoints returned `503`, the 70-second drain completed, restore checkpoint `2026-08-03 12:15:52.281915+00` was recorded, conversion reverified ten rows with zero writes, migration `0009` applied, sign-in and the full encrypted task lifecycle passed, and production remained at migration count `8` with no rehearsal row. [Reason why added: accepts development contract behavior while preserving the production boundary.]

- 2026-08-02: Drafted contract migration `0009_contract_encrypted_columns.sql`, moved the runtime schema and adapters to ciphertext-only logical fields, retained a production-only pre-contract conversion schema, and passed database-free checks plus all four guarded post-contract integration tests. Only `atemoya_test` received `0009`, with migration count `10` and latest migration `1785693662810`; application databases remain unchanged. [Reason why added: establishes the reviewed irreversible artifact and its guarded test-database proof.]

- 2026-08-02: Completed the maintenance-gated Neon development rehearsal: Preview page/auth/POST checks returned `503`, the 70-second drain completed, eight rows converted, ten scope rows verified, the rerun wrote zero rows, all aggregate shadows were complete, the encrypted task lifecycle passed, and production isolation/smoke checks remained clean. [Reason why added: establishes development acceptance before drafting the contract migration.]

- 2026-08-02: Added and verified the local `pnpm data:convert` operator with exact target confirmations, Varlock-only secrets, guarded test-database identity, non-test `APP_ENV` checks, deterministic interruption and concurrent-source injection, and captured-output secrecy. [Reason why added: completes the conversion command and failure boundary without touching development, Preview, or production data.]

- 2026-08-02: Added and verified restartable atomic conversion batches with stable cursors, source/shadow guards, rollback assertions, encrypted Better Auth backup-code conversion, per-batch readback, final global verification, and idempotent reruns. [Reason why added: completes the write engine only against guarded `atemoya_test` without exposing an operator command or modifying deployed databases.]

- 2026-08-02: Added and verified the read-only conversion preflight with exact target confirmations, stable scans, normalized-collision and OAuth-token checks, pending/complete shadow validation, Better Auth-owned value decoding, late-write mismatch detection, and sanitized events. [Reason why added: establishes the fail-closed gate for conversion writes without converting or modifying any application row.]

- 2026-08-02: Added and verified a root Next.js maintenance Proxy controlled only by `MAINTENANCE_MODE=1`, with plain no-store `503` responses for pages, Better Auth, and Server Actions plus static-asset exclusions and a default-off environment contract. [Reason why added: establishes the application write barrier required before conversion while leaving Preview, production, and Neon untouched.]

- 2026-08-02: Enabled Better Auth-native encrypted backup-code storage and verified ciphertext persistence, regeneration, rejection of superseded codes, one-time recovery consumption, and captured-log secrecy against the guarded integration database. [Reason why added: completes encrypted storage for newly issued backup codes without double encryption, deployment, or conversion of existing plaintext sets.]
