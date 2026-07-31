# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Revise ADR-009 and its encryption plan before implementation:

1. Choose a feasible conversion shape: maintenance-only shadow columns or a
   dedicated transaction-capable client.
2. Specify the complete Better Auth adapter decorator contract, maintenance
   write barrier, canonical normalizer, logging policy, two-migration workflow,
   and PostgreSQL integration-test seam.
3. Review and approve the revised record before writing an implementation plan.

## Immediate Goal

Produce an implementation-ready encryption design without changing application
code or production data.

## Open Questions

- Choose between maintenance-only shadow columns and a dedicated
  transaction-capable client for production conversion.
- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
