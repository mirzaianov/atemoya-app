# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Prepare the reviewed changes for the controlled production rollout without
deploying or migrating production yet:

1. Commit the verified Varlock environment split and its documentation.
2. Push the feature branch and merge it into `develop`, then confirm the Preview
   deployment remains healthy.
3. Do not merge `develop` into `main` yet; production still lacks additive
   migration `0008` and remains plaintext-authoritative.
4. Reconfirm Production `MAINTENANCE_MODE` remains disabled, the Neon production
   restore window remains six hours, and Vercel Function Max Duration remains
   ten seconds.
5. Review the exact staged production deployment and migration sequence before
   authorizing any production change.

## Immediate Goal

Commit and Preview-test the verified environment split before authorizing any
production rollout action.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
