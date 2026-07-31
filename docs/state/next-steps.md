# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Implement the encrypted task database boundary on the feature branch:

1. Encrypt task titles with record-bound context and calculate per-user title
   lookups before create and update writes.
2. Read duplicate-title conditions through the lookup column and decrypt task
   titles before returning the existing `Task` DTO.
3. Keep ordering, completion, restoration, reordering, and deletion on readable
   operational columns.
4. Cover create, list, update, duplicate rejection, completion, restoration,
   reordering, and deletion through the guarded `atemoya_test` integration path.
5. Do not merge or deploy the encrypted runtime to Preview until the development
   conversion rehearsal and contract migration are ready.

## Immediate Goal

Implement and verify encrypted task persistence in isolation; keep Preview on
the plaintext-authoritative release and leave production unchanged.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
