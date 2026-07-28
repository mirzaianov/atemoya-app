# Password Reset Plan

Status: deployed and production verified

## Goal

Let email/password users recover access through a secure email link while preserving two-factor
authentication and invalidating existing sessions and trusted-device grants.

## Decisions

- Use Better Auth's built-in password-reset token and endpoints.
- Send reset and password-changed emails through the existing Resend REST integration.
- Add `/forgot-password` and `/reset-password` routes using the existing auth-page patterns.
- Let signed-in users send the reset link directly to their authenticated account email from
  Settings.
- Keep request responses generic so callers cannot determine whether an email is registered.
- Expire reset tokens after one hour and rely on Better Auth's atomic token consumption for
  single-use enforcement.
- Apply the shared 8-128 character password policy and require matching password confirmation.
- Do not create a session or automatically sign the user in after reset.
- Revoke every active session after reset.
- Delete every `trust-device-*` verification record whose value matches the reset user's ID.
- Preserve the user's TOTP secret, backup codes, enabled state, and current 2FA lockout state.
- Send a background password-changed notification after a successful reset.
- Add no dependency, schema change, or database migration.

## Flow

```text
Login
  -> Forgot Password
  -> /forgot-password submits email
or
Settings
  -> Send Reset
  -> submits the authenticated account email
  -> Better Auth returns a generic response
  -> Resend sends a one-hour reset link when the account exists
  -> Better Auth validates the link
  -> /reset-password receives the valid token
  -> user submits and confirms a new password
  -> Better Auth consumes the token and updates the credential password
  -> trusted-device grants are deleted
  -> all sessions are revoked
  -> password-changed notification is scheduled
  -> /login?reset=1 confirms success
  -> user signs in with the new password
  -> a 2FA-enabled account must pass TOTP or an unused backup code
```

Invalid or expired links redirect to `/reset-password?error=INVALID_TOKEN`, which offers a path to
request another email. A consumed token must fail in the same way on reuse.

## Implementation

1. Extract the existing Resend request into a small server-only mail helper shared by verification,
   reset-link, and password-changed messages.
2. Extend `emailAndPassword` with:
   - `sendResetPassword`
   - `resetPasswordTokenExpiresIn: 3600`
   - `revokeSessionsOnPasswordReset: true`
   - `onPasswordReset` for trusted-device cleanup and the background notification
3. Delete trusted-device grants from the existing `verification` table by matching both:
   - `verification.value = user.id`
   - `verification.identifier LIKE 'trust-device-%'`
4. Add shared forgot/reset form schemas and focused notice/error mapping tests.
5. Add a Forgot Password action to login.
6. Add `/forgot-password` with an email form, generic success notice, 30-second resend cooldown, and
   Back to Login action.
7. Add a Settings action that sends the reset link to the authenticated account email, reports the
   result inline, and applies the same 30-second resend cooldown.
8. Add `/reset-password` with invalid-token recovery and new-password/confirmation fields using the
   existing password controls and shared raised-button styles.
9. Redirect successful resets to `/login?reset=1` and show a success notice there.

## Security And Accessibility

- Never log reset URLs, tokens, passwords, or Resend payloads.
- Keep Resend credentials and mail delivery server-only.
- Schedule email delivery with the configured Next.js background-task handler so provider latency
  does not expose whether an account exists.
- Keep the request message identical for registered and unregistered addresses.
- Do not clear or modify TOTP secrets or backup codes during password recovery.
- Remove server-side trusted-device records; stale browser cookies then fail validation and expire on
  the next credential sign-in.
- Use visible labels, native email/password semantics, password-manager autocomplete values,
  `aria-live` notices, and existing focus-visible behavior.

## Verification

- Registered and unregistered emails receive the same request-page response.
- A registered account receives a one-hour reset link through Resend.
- Invalid, expired, and reused tokens cannot reset a password.
- Password and confirmation must match and respect the shared length bounds.
- The old password fails and the new password succeeds after reset.
- Reset does not automatically sign the user in.
- Every previously active session is rejected after reset.
- A previously trusted browser must complete 2FA after reset.
- TOTP and an unused backup code still work after reset.
- Existing backup codes, 2FA enrollment, and lockout state remain unchanged.
- The password-changed notification is sent without containing the password or reset token.
- Focused tests, type checking, linting, formatting, and a production build pass.

## Manual Acceptance

1. Reset an account without 2FA and sign in with the new password.
2. Reset a 2FA-enabled account and confirm TOTP and backup-code sign-in still work.
3. Trust a browser, reset the password from another browser, and confirm the trusted browser's old
   session is revoked and its next sign-in requires 2FA.
4. Confirm an old password, reused reset link, and invalid reset link all fail.
5. Confirm the request page does not reveal whether an email is registered.
6. From both request entry points, send a reset email and confirm the disabled Send Reset button
   shows the shared spinner and counts down from 30 seconds; Settings must not require re-entering the
   account email.
