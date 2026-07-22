# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Continue the approved security-hardening sequence one step at a time:

1. Manually accept and deploy the implemented password-reset flow.
2. Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Immediate Goal

Manually accept the password-reset flow from Sign In and Settings, including its 2FA and
trusted-device behavior, then deploy it.

## Open Questions

None for password-reset acceptance.

## Deferred UI Notes

- Design the email-change confirmation flow after outbound email is configured; require current-address approval and new-address verification.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
