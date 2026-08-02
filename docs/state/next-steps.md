# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Prepare and review the controlled Neon development rehearsal before changing
any deployed environment:

1. Commit the guarded operator boundary, then prepare its merge into `develop`.
2. Before that merge can deploy the encrypted runtime, enable
   `MAINTENANCE_MODE=1` for Vercel Preview and verify the maintenance response on
   a deployment containing the gate.
3. Record the Neon development restore point, wait for the invocation drain,
   and verify source stability before conversion.
4. Run the reviewed development conversion from the trusted local environment,
   verify ciphertext, lookups, counts, and idempotency, then smoke-test the
   encrypted Preview runtime while production remains unchanged.
5. Draft the contract migration only after the complete development rehearsal
   passes.

## Immediate Goal

Review the exact development rehearsal checklist. Do not merge, deploy, enable
maintenance, or run `pnpm data:convert development` until that checklist is
approved.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
