# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Enable and verify Better Auth's native encrypted backup-code storage on the
feature branch:

1. Set `backupCodeOptions.storeBackupCodes` to `encrypted` without adding
   application-layer encryption around Better Auth-owned TOTP or backup-code
   values.
2. Verify newly generated and regenerated backup-code sets are stored as Better
   Auth ciphertext and still support recovery through focused tests.
3. Keep existing plaintext backup-code rows unchanged for the restartable
   conversion command; do not deploy the encrypted runtime to Preview yet.
4. Preserve the independent `BETTER_AUTH_SECRET` boundary and strict captured-log
   assertions.

## Immediate Goal

Implement and verify encrypted Better Auth backup-code persistence in isolation;
keep Preview on the plaintext-authoritative release and leave production
unchanged.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
