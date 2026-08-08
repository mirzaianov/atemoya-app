# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Push the completed `feature/ATE-4-tags` commits, run migration `0010_task_tags`
against Preview through the protected workflow, and complete ADR-014 manual
acceptance plus the confirmed-UI synchronization checks before promoting the
migration and feature through `develop` to `main`. No maintenance mode or data
conversion is required because the migration is additive and does not modify
existing rows.

## Immediate Goal

Complete the Preview migration and manual tag acceptance checklist in
`docs/architecture/task-tags-and-filters-plan.md`. Confirm task create, edit,
and delete results appear when loading ends; Settings immediately reflects
confirmed nickname, tag, and two-factor changes; and authentication/account
loading remains visible until each destination route appears.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
