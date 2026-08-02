# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Draft and verify the contract migration without applying it to Neon:

1. Define the final Drizzle schema for protected columns and constraints.
2. Generate one contract migration that removes plaintext protected columns,
   promotes verified ciphertext and blind-index columns, removes obsolete
   plaintext uniqueness indexes, and makes required final columns non-null.
3. Preserve Better Auth-owned password hashes, TOTP secrets, and encrypted
   backup-code storage unchanged.
4. Add guarded integration coverage for converted legacy rows and new
   ciphertext-only rows, including uniqueness, foreign keys, and readable
   application behavior after migration.
5. Review the generated SQL and rollback assumptions before applying it to any
   Neon database.

## Immediate Goal

Produce a reviewed, test-covered contract migration. Do not apply it to
`atemoya_test`, development, Preview, or production yet.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
