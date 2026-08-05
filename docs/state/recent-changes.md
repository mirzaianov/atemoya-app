# Recent Changes

Status: project-state recent implementation and documentation history

Keep only the 10 most recent entries.

## Recent Changes

- 2026-08-05: Extended the repository-local Oxlint statement-padding rule to require blank lines around complete `try`/`catch`/`finally` statements after confirming Oxlint and Oxfmt have no native equivalent. [Reason why added: records the enforced error-handling readability convention and why the local rule remains necessary.]

- 2026-08-04: Closed ADR-009 after Neon rejected the recorded production plaintext checkpoint as outside the available history window. [Reason why added: confirms the final six-hour restore-history condition passed and the database-theft encryption rollout is complete.]

- 2026-08-03: Completed the maintenance-gated Production encryption rollout: all application endpoints returned `503`, the 70-second drain completed, restore checkpoint `2026-08-03 16:03:34.60475+00` was recorded, additive migration `0008` applied, 25 rows converted, 27 protected records verified and reverified with zero writes, contract migration `0009` applied, and sign-in plus the encrypted task lifecycle passed after maintenance was disabled. [Reason why added: records operational acceptance before restore-history expiry.]

- 2026-08-03: Revised the protected production migration guard to require a full commit SHA from current `develop` history, allowing additive migration `0008` and contract migration `0009` to be promoted separately without permitting feature branches or unrelated refs. [Reason why added: resolves the production rollout conflict between strict branch flow and the approved expand/contract conversion sequence.]

- 2026-08-03: Split local Varlock references into explicit `.env.dev` and `.env.prod` files, removed required database and encryption defaults from `.env.schema`, completed independent production key provisioning in KeePass and Vercel Production, verified both database identities, proved missing production configuration fails closed, and accepted the merged Preview through sign-in plus an isolated encrypted task write and deletion. [Reason why added: prevents a production operator command from silently inheriting development credentials when its environment file is absent.]

- 2026-08-03: Completed the development application contract rehearsal under Preview maintenance: all endpoints returned `503`, the 70-second drain completed, restore checkpoint `2026-08-03 12:15:52.281915+00` was recorded, conversion reverified ten rows with zero writes, migration `0009` applied, sign-in and the full encrypted task lifecycle passed, and production remained at migration count `8` with no rehearsal row. [Reason why added: accepts development contract behavior while preserving the production boundary.]

- 2026-08-02: Drafted contract migration `0009_contract_encrypted_columns.sql`, moved the runtime schema and adapters to ciphertext-only logical fields, retained a production-only pre-contract conversion schema, and passed database-free checks plus all four guarded post-contract integration tests. Only `atemoya_test` received `0009`, with migration count `10` and latest migration `1785693662810`; application databases remain unchanged. [Reason why added: establishes the reviewed irreversible artifact and its guarded test-database proof.]

- 2026-08-02: Completed the maintenance-gated Neon development rehearsal: Preview page/auth/POST checks returned `503`, the 70-second drain completed, eight rows converted, ten scope rows verified, the rerun wrote zero rows, all aggregate shadows were complete, the encrypted task lifecycle passed, and production isolation/smoke checks remained clean. [Reason why added: establishes development acceptance before drafting the contract migration.]

- 2026-08-02: Added and verified the local `pnpm data:convert` operator with exact target confirmations, Varlock-only secrets, guarded test-database identity, non-test `APP_ENV` checks, deterministic interruption and concurrent-source injection, and captured-output secrecy. [Reason why added: completes the conversion command and failure boundary without touching development, Preview, or production data.]

- 2026-08-02: Added and verified restartable atomic conversion batches with stable cursors, source/shadow guards, rollback assertions, encrypted Better Auth backup-code conversion, per-batch readback, final global verification, and idempotent reruns. [Reason why added: completes the write engine only against guarded `atemoya_test` without exposing an operator command or modifying deployed databases.]
