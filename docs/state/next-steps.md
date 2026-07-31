# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Apply additive migration `0008_productive_paibok.sql` to the application
development database only:

1. Confirm local `DATABASE_URL` still identifies the Neon `development` branch
   and not production.
2. Run the normal Drizzle migration command once against development.
3. Verify migration count/latest migration and inspect the expected shadow
   columns, verification metadata, and partial indexes.
4. Run a focused Preview smoke check while plaintext columns remain
   authoritative.
5. Stop and report results before implementing encrypted task reads or writes.

## Immediate Goal

Promote and verify the additive schema in development only; do not apply it to
production, convert rows, or connect encrypted reads and writes.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
