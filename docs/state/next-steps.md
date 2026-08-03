# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Prepare the pinned-ancestor migration guard without deploying or migrating
production yet:

1. Commit and merge the migration guard correction from the feature branch into
   `develop`.
2. Confirm the updated workflow rejects a branch name for Production before
   Drizzle runs.
3. Do not merge `develop` into `main` yet; production still lacks additive
   migration `0008` and remains plaintext-authoritative.
4. Set Production maintenance to `1` only immediately before the approved
   `develop` to `main` merge and gated deployment.

## Immediate Goal

Merge and negative-test the pinned-ancestor migration guard before authorizing
the gated Production deployment.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
