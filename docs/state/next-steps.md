# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Prepare production secrets and rollout controls without deploying or migrating
production:

1. Do not merge `develop` into `main` yet; production lacks additive migration
   `0008` and the four application-protection secrets.
2. Generate independent production encryption and blind-index keys and store
   their two keyrings and active versions in KeePass.
3. Add the four values to Vercel Production only as sensitive variables; never
   reuse the development/Preview keys.
4. Confirm Production `MAINTENANCE_MODE` remains disabled, the Neon production
   restore window remains six hours, and Vercel Function Max Duration remains
   ten seconds.
5. Review the exact staged production deployment and migration sequence before
   authorizing any production change.

## Immediate Goal

Provision and verify independent production key material without changing the
production application or database.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
