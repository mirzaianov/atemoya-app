# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Close ADR-009 after Neon's six-hour production restore history no longer contains
the plaintext checkpoint:

1. Wait until after `2026-08-03 22:03:34.60475+00`.
2. Confirm Neon's earliest available production restore time is later than
   `2026-08-03 16:03:34.60475+00`.
3. Record final ADR-009 rollout closure. Do not run the pre-contract conversion
   command again; production is already on contract migration `0009`.

## Immediate Goal

Let the plaintext-bearing production restore history expire, then close ADR-009
rollout monitoring.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
