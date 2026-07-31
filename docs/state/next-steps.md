# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Implement the Better Auth Drizzle adapter decorator on the feature branch:

1. Decorate the installed adapter instead of reimplementing it, transforming
   protected user, session, and verification writes, equality conditions, and
   returned records while preserving metadata and unprotected operations.
2. Preserve native transaction, `consumeOne`, and `incrementOne` behavior and
   fail closed for unsupported protected multi-row writes, operators, and sorts.
3. Derive readable verification purpose/subject metadata needed by trusted-device
   revocation without plaintext scans.
4. Cover the approved adapter contract through guarded `atemoya_test` integration
   tests with deterministic keys and captured-log assertions.
5. Keep the encrypted runtime off Preview until authentication encryption,
   backup-code handling, conversion rehearsal, and the contract migration are
   ready together.

## Immediate Goal

Implement and verify encrypted Better Auth persistence in isolation; keep
Preview on the plaintext-authoritative release and leave production unchanged.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
