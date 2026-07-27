# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Complete the retained-task rollout:

1. Check production for case-insensitive duplicate titles before applying `0006_lively_lorna_dane.sql`.
2. Apply the migration, manually accept completion, restoration, collapsing, ordering, duplicate validation, and deletion, then deploy and smoke test.

## Immediate Goal

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow after outbound email is configured; require current-address approval and new-address verification.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
