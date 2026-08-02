# Next Steps

Status: project-state immediate recommendation

## Recommended Next Steps

Implement and verify the root maintenance write barrier on the feature branch:

1. Add one root Next.js `proxy.ts` gate controlled by `MAINTENANCE_MODE=1`.
2. Return plain `503 Service Unavailable` responses for application pages,
   Better Auth requests, and Server Action requests. Set `Cache-Control` to
   `no-store`, include `Retry-After`, and exclude framework assets and public
   files.
3. Verify enabled and disabled behavior through Next.js Proxy test utilities,
   including representative page, auth, and Server Action requests.
4. Add no database-backed bypass or conversion behavior, and leave maintenance
   disabled in Preview and production.

## Immediate Goal

Establish the tested application write barrier required before implementing or
rehearsing the restartable conversion command; leave deployed environments
unchanged.

## Open Questions

- Decide whether Better Auth rate limiting needs shared storage before multi-instance production.

## Deferred UI Notes

- Design the email-change confirmation flow around current-address approval,
  new-address verification, session handling, and failure behavior.
- Design the password-change confirmation flow around Better Auth's current-password check and decide whether to revoke other sessions.
