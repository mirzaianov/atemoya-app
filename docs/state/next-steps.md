# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Implement the ADR-009 cryptography primitives:

1. Add one server-only Node cryptography module for versioned AES-256-GCM
   envelopes and independent HMAC-SHA-256 blind indexes.
2. Add database-free tests for key parsing, round trips, fresh IVs, tampering,
   wrong context/key/version rejection, and the approved equality normalizers.
3. Report verification and a focused commit suggestion before adding keys,
   changing schema, or connecting encryption to application data.

## Immediate Goal

Implement and verify cryptography primitives with deterministic test keys only;
do not change Neon schema, KeePass, Vercel, or application persistence yet.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
