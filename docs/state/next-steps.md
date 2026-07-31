# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Add the ADR-009 development-key configuration boundary:

1. Declare independent versioned data-encryption and blind-index keyrings plus
   active versions in `.env.schema` and the server-only configuration boundary.
2. Generate two independent 32-byte development keys and store only their
   version-one JSON keyrings in the existing KeePass group.
3. Add the same development values to Vercel Preview only; do not create or
   expose production keys yet.
4. Verify fail-closed startup for missing, malformed, reused, and unknown-version
   configuration without connecting encryption to application data.
5. Report verification and a focused commit suggestion before applying the
   additive migration to the application development database.

## Immediate Goal

Configure and verify development keys only; do not create production keys,
promote migration `0008`, convert rows, or connect encrypted reads and writes.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
