# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Complete the database-environment workflow rollout:

1. Merge the `migrate-database` workflow and environment documentation into the default branch.
2. Run the workflow twice against `Preview` to prove migration idempotency.
3. Run the guarded negative `Production` test with a ref other than current `develop`, confirming Drizzle never executes.

## Immediate Goal

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow after outbound email is configured; require current-address approval and new-address verification.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
