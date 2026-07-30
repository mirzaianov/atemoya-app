# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Design the email-change confirmation flow:

1. Review Better Auth's email-change capabilities and the existing Resend delivery boundary.
2. Specify current-address approval, new-address verification, session handling, and failure behavior.
3. Record and approve the design before implementation.

## Immediate Goal

Produce an approved email-change design without changing the accepted authentication or database-environment boundaries.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
