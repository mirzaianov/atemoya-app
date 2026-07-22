# Two-Factor Authentication Plan

## Status

Implemented, manually accepted, deployed, migrated, smoke-tested, and production-monitored as of
2026-07-22.

## Goal

Let users optionally protect their accounts with authenticator-app TOTP while preserving
the project's existing Better Auth, Settings, modal, form, and mutation patterns.

## Decisions

- Use Better Auth's built-in `twoFactor` server plugin and `twoFactorClient` client plugin.
- Support TOTP authenticator apps and one-time backup codes only.
- Do not provide email OTP, administrator bypass, or remote recovery.
- Use `Atemoya` as the TOTP issuer.
- Require the account password before enabling, disabling, or regenerating 2FA.
- Require a valid TOTP code before enrollment becomes active.
- Generate 10 backup codes, store them encrypted, and display them only once.
- Provide Copy and Download actions and require confirmation that the codes were saved.
- Offer "Trust this device for 30 days" during sign-in, unchecked by default.
- Revoke every other session after 2FA is enabled or disabled while preserving the current
  session.
- Explicitly configure a 10-minute challenge, 30-day trusted-device lifetime, and account
  lockout of 10 failed attempts for 15 minutes.

## Alternatives Rejected

- Custom TOTP implementation: duplicates security-sensitive code already owned by Better
  Auth.
- Email OTP fallback: depends on the same email account used for verification and recovery,
  weakening factor separation.
- Managed external identity provider: adds disproportionate infrastructure and migration
  work for the current product.

## Settings Flow

```text
Settings -> Security -> Two-factor authentication
  -> Set Up
  -> confirm account password
  -> display locally rendered QR code and manual setup key
  -> enter current six-digit TOTP code
  -> display 10 backup codes once
  -> copy or download codes
  -> confirm codes were saved
  -> revoke other sessions
  -> show Enabled status
```

The enabled state provides actions to regenerate backup codes and disable 2FA. Regeneration
invalidates all previous backup codes. Disabling requires password confirmation, removes
trusted-device state, and revokes other sessions.

## Sign-In Flow

```text
Email and password accepted
  -> Better Auth returns a two-factor challenge instead of a session
  -> /two-factor accepts a six-digit TOTP code
  -> optional trusted-device checkbox remains unchecked
  -> successful verification creates the session
  -> user returns to the authenticated homepage
```

The challenge page also offers "Use a backup code." Each backup code works once. Missing or
expired challenge state returns the user to `/login`.

## Recovery Policy

- A signed-in user can disable 2FA from Settings after confirming the account password.
- A trusted device can complete sign-in without another TOTP challenge during its 30-day
  lifetime.
- A signed-out user who loses both the authenticator and every backup code cannot recover
  the account remotely.
- Support staff and email ownership must not bypass the second factor.

## Implementation

1. Add the Better Auth server and client 2FA plugins.
2. Extend the Drizzle schema with `user.twoFactorEnabled` and the plugin-owned `twoFactor`
   table, including the user relation and cascade deletion.
3. Generate a migration and apply it before deploying code that enables the plugin.
4. Expose the current 2FA status to the protected Settings page.
5. Add a Security section with setup and management actions.
6. Compose setup and management screens with the shared modal layout, Base UI fields,
   shared buttons, React Hook Form, Zod, and TanStack Query mutations.
7. Render the QR code locally from Better Auth's returned `totpURI`; never send the secret
   to an external QR service. Also expose the manual setup key.
8. Keep TOTP secrets and backup codes only in transient component state during enrollment;
   do not store them in URLs, logs, browser storage, or the query cache.
9. Add `/two-factor` for TOTP and backup-code challenges.
10. Update login handling to route `twoFactorRedirect` responses to the challenge page.
11. Revoke other sessions after successful enable and disable operations.
12. Add enabled, disabled, pending, failure, lockout, and expired-challenge feedback using
    the existing toast and form-error patterns.

## Security And Accessibility

- Keep Better Auth's encrypted backup-code storage and built-in 2FA endpoint rate limit.
- Never log TOTP URIs, secrets, verification codes, backup codes, or challenge cookies.
- Keep the trusted-device choice explicit and unchecked.
- Use one input with `inputMode="numeric"` and `autoComplete="one-time-code"` for TOTP.
- Preserve visible labels, programmatic errors, keyboard operation, focus management, and
  loading-disabled buttons.
- Announce successful enrollment and challenge failures without exposing sensitive values.
- Clear transient enrollment values when the setup modal closes.

## Verification

Manual acceptance completed on 2026-07-21. The user verified normal non-2FA sign-in; wrong-password
rejection; QR and manual-key enrollment; invalid and valid TOTP handling; generation, copy, download,
single use, and regeneration of 10 backup codes; saved-code confirmation; `/two-factor` redirects;
trusted-device behavior; disable; other-session revocation; and the 10-attempt, 15-minute lockout.
The code was deployed on 2026-07-22. The deployment database received migration `0005`, the
production smoke test passed with a dedicated account, and post-rollout monitoring passed.

- The migration applies before the plugin is deployed.
- Users without 2FA continue to sign in normally.
- Enrollment remains inactive until a valid TOTP code is submitted.
- Invalid passwords and TOTP codes do not enable or disable 2FA.
- Enabled users receive no authenticated session until they complete the challenge.
- TOTP, one-time backup-code, trusted-device, expiry, and lockout paths behave as designed.
- Regenerated backup codes invalidate previous codes.
- Enabling and disabling revoke other sessions but preserve the current session.
- QR secrets and backup codes never enter URLs, logs, storage, or external requests.
- Type checking, tests, linting, formatting, and a production build pass.
