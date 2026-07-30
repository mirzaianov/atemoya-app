# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Implement the accepted database-theft encryption design in development:

1. Add the cryptography boundary, blind-index schema, verification metadata, and
   maintenance gate.
2. Integrate task and Better Auth persistence, including encrypted backup-code
   storage, against synthetic development data.
3. Build and fully verify the one-time conversion command in development.
4. Review the completed development implementation before scheduling the
   production maintenance window.

## Immediate Goal

Complete and verify the development implementation without converting
production data.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
