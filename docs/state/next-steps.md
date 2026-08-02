# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Implement the restartable one-time conversion command against the guarded test
database:

1. Require an explicit target environment and confirmation before writes; keep
   production inaccessible during development tests.
2. Preflight normalized collisions, unexpected plaintext nulls, dormant OAuth
   token values, and source/shadow consistency before conversion.
3. Convert missing shadows in stable atomic batches, including Better Auth
   backup-code sets, and read back each batch before continuing.
4. Make interruption restartable and finish with complete decryptability,
   blind-index, uniqueness, row-count, and source-stability verification.
5. Log only phases, counts, stable IDs, and fixed error categories; include no
   DDL and touch neither Preview nor production data.

## Immediate Goal

Prove the conversion and restart path against synthetic `atemoya_test` data
without changing the development application database or deployed environments.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
