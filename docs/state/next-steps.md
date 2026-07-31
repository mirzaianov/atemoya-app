# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Review ADR-009 and its revised encryption plan before implementation:

1. Approve or request changes to the revised architecture record.
2. After approval, write and review a staged implementation plan before changing
   application code, Neon schema, or secrets.

## Immediate Goal

Review the implementation-ready encryption design without changing application
code, Neon resources, secrets, or production data.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
