# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Complete the ADR-009 integration-harness checkpoint:

1. In the Neon `development` branch, create role `atemoya_test_owner` and
   database `atemoya_test` with that role as owner.
2. Store only its pooled connection string in KeePass as
   `atemoya-app/TEST_DATABASE_URL`; do not add it to Vercel or GitHub.
3. Run `pnpm test:integration` and confirm migration, guarded cleanup, and
   synthetic insert/reset checks pass.
4. Report the result before implementing cryptography or changing application
   schema.

## Immediate Goal

Verify the guarded harness against its dedicated Neon development database
without touching Preview tables, production resources, or production data.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
