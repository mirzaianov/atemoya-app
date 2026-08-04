# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

ADR-009 has no remaining rollout action. Before any multi-instance production
scaling, decide whether Better Auth rate limiting requires shared storage. Do not
run the pre-contract conversion command again; both application databases are on
contract migration `0009`.

## Immediate Goal

Return to normal product work with the database-theft encryption rollout closed.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
