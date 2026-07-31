# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Create the ADR-009 additive shadow-column migration:

1. Add nullable ciphertext and blind-index shadow columns for the protected
   user, session, verification, and task values.
2. Add readable `verification.purpose` and `verification.subject_user_id`
   metadata plus the approved partial unique lookup indexes.
3. Relax `NOT NULL` only on protected plaintext source columns; keep those
   source columns authoritative during development preparation.
4. Generate and review one additive Drizzle migration, then verify it through
   the guarded `atemoya_test` integration database.
5. Report verification and a focused commit suggestion before adding keys or
   connecting encryption to application data.

## Immediate Goal

Create and verify the additive schema only; do not configure KeePass or Vercel
keys, convert rows, or connect application reads and writes yet.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
