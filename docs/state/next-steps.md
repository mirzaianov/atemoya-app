# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Validate the contract migration only against guarded `atemoya_test` after
explicit approval:

1. Confirm `atemoya_test` contains no data that must be retained and that
   `TEST_DATABASE_URL` still resolves to `atemoya_test_owner`.
2. Run `pnpm test:integration`; this will apply migration `0009`, reset only the
   guarded test database, and exercise final task and Better Auth persistence.
3. Verify the guarded database reports migration count `10` and latest migration
   `1785693662810`.
4. Review uniqueness, foreign-key, converted-row, new-row, and readable-runtime
   assertions from the integration result.
5. Do not apply `0009` to development, Preview, or production in this step.

## Immediate Goal

Obtain explicit approval, then apply and verify the contract migration only on
`atemoya_test`. Development, Preview, and production remain unchanged.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
