# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Expose the verified conversion engine through a guarded local operator command
and finish failure-injection coverage:

1. Add a local-only `pnpm` command that requires an explicit `test`,
   `development`, or `production` target and exact confirmation. Bind `test` to
   guarded `TEST_DATABASE_URL`; bind non-test targets to the selected
   environment's `DATABASE_URL`.
2. Load key configuration and `BETTER_AUTH_SECRET` only through the existing
   Varlock environment; never accept keys in arguments or logs.
3. Inject a deterministic interruption after a committed batch and prove a
   rerun skips complete shadows.
4. Inject a source change between preflight and a batch update and prove the
   atomic assertion rolls back the batch.
5. Capture stdout and stderr and prove no sensitive markers are emitted. The
   command must perform no DDL and must not trigger deployment.

## Immediate Goal

Complete the operator and failure boundary against `atemoya_test` without
running conversion against development, Preview, or production.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
