# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Continue the approved security-hardening sequence one step at a time:

1. Add password reset through the configured Resend sender.
2. Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Immediate Goal

Add password reset through the configured Resend sender.

## Open Questions

None for the current password-reset step.

## Deferred UI Notes

- Design the email-change confirmation flow after outbound email is configured; require current-address approval and new-address verification.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
