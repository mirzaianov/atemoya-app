# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Begin ADR-009 development implementation from the existing architecture plan:

1. Implement only the isolated test-database harness and its exact database/role
   guard.
2. Report verification and a focused commit suggestion, then wait before
   continuing to cryptography code or manual Neon setup.
3. Keep Production conversion behind the separate rehearsal and runbook
   approval in `docs/architecture/database-theft-encryption-plan.md`.

## Immediate Goal

Implement and verify the isolated test harness without changing application
behavior, production resources, secrets, or production data.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
