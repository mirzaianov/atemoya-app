# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Extend the verified preflight into restartable conversion batches against the
guarded test database:

1. Run the accepted read-only preflight before the first write.
2. Convert only wholly pending rows in stable atomic batches, with source-value
   guards and missing-shadow guards on every update.
3. Encrypt plaintext Better Auth backup-code JSON in place while accepting and
   verifying already-encrypted sets.
4. Read back and verify each committed batch, then rerun the global preflight to
   prove complete decryptability, lookups, metadata, counts, and source
   stability.
5. Inject an interruption and prove a restart skips verified rows; keep the
   command free of DDL and inaccessible to Preview and production data.

## Immediate Goal

Convert and verify synthetic `atemoya_test` rows through restartable atomic
batches without changing the development application database or deployed
environments.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
