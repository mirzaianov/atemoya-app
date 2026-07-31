# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Implement the ADR-009 no-plaintext logging boundary:

1. Add one small server-only logger that accepts only fixed event codes and
   typed allowlisted operational metadata.
2. Configure Better Auth logging to discard upstream messages and arguments.
3. Add captured-output tests proving marker plaintext, keys, indexes, SQL
   parameters, and ciphertext envelopes cannot reach stdout or stderr.
4. Report verification and a focused commit suggestion before adding keys,
   changing schema, or connecting encryption to application data.

## Immediate Goal

Implement and verify the strict logging allowlist; do not change Neon schema,
KeePass, Vercel, or application persistence yet.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
