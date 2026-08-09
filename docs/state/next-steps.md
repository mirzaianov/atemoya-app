# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Assess whether Better Auth rate limiting needs shared storage before the
application runs across multiple Production instances.

## Immediate Goal

Document the expected Vercel instance and concurrency behavior, then decide
whether the current process-local limiter is sufficient or requires a shared
store and a separate implementation plan.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
