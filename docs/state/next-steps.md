# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Prepare and execute the maintenance-gated development application contract
rehearsal without touching production:

1. Commit and deploy the contract-compatible application through `develop`, then
   confirm Preview still signs in and reads existing encrypted data before the
   contract migration.
2. Enable Preview maintenance, deploy it, verify page/auth/POST `503` responses,
   and complete the recorded 70-second drain.
3. Record a fresh Neon development restore checkpoint and rerun the development
   conversion command; it must convert zero rows and pass global verification.
4. Apply migration `0009` only to the Neon development application database and
   verify migration count `10` with latest migration `1785693662810`.
5. Disable Preview maintenance through a new deployment, then verify sign-in,
   existing tasks, and create/edit/complete/restore/delete behavior.
6. Confirm production remains at migration count `8` and passes its focused
   smoke check.

## Immediate Goal

Commit the guarded contract implementation, then begin the development-only
contract rehearsal. Production remains unchanged.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
