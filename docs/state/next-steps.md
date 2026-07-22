# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Continue the approved security-hardening sequence one step at a time:

1. Decide whether and when to add HSTS after the production HTTPS domain policy is stable.
2. Add password reset through the configured Resend sender.
3. Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Immediate Goal

Decide whether and when to enable HSTS after finalizing production HTTPS domain coverage.

## Open Questions

- What final production domain(s) should be covered before HSTS is enabled?

## Deferred UI Notes

- Design the email-change confirmation flow after outbound email is configured; require current-address approval and new-address verification.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
