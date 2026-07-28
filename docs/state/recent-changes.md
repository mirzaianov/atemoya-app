# Recent Changes

Status: project-state recent implementation and documentation history

Keep only the 10 most recent entries.

## Recent Changes

- 2026-07-28: Moved content-sized toast notifications to the bottom center, capped long messages at `18rem`, and reserved red styling for failures by changing successful task deletion to the existing info state. [Reason why added: records the user-visible notification layout and semantic color behavior.]

- 2026-07-27: Implemented retained task completion with Base UI checkbox controls, collapsible Active and Completed groups, optimistic completion and restoration, active-only reordering, and case-insensitive title uniqueness across both groups. [Reason why added: records the local implementation before migration, manual acceptance, and deployment.]

- 2026-07-27: Production-verified the deployed password-reset flow. [Reason why added: records successful production smoke testing while rollout monitoring remains pending.]

- 2026-07-27: Deployed the manually accepted password-reset flow. [Reason why added: records production availability before verification.]

- 2026-07-27: Manually accepted the password-reset flow from Sign In and Settings, including 2FA preservation and session and trusted-device revocation. [Reason why added: records completion of local recovery acceptance before deployment.]

- 2026-07-22: Clarified password-reset success and resend timing, made forgot-password feedback mutually exclusive within a reserved two-line area, and standardized login, signup, and forgot-password controls at the existing auth width. [Reason why added: keeps recovery feedback unambiguous and prevents auth-page sizing drift.]

- 2026-07-22: Added a Settings password-reset action that sends the existing one-hour recovery link directly to the authenticated account email, with inline status and a 30-second resend cooldown. [Reason why added: makes password recovery discoverable without requiring a signed-in user to leave Settings or re-enter a known email.]

- 2026-07-22: Implemented Better Auth password recovery through Resend with generic requests, one-hour single-use links, shared password validation, no automatic sign-in, all-session and trusted-device revocation, preserved 2FA state, and password-changed notices. [Reason why added: records the completed local implementation and its security behavior before acceptance.]

- 2026-07-22: Closed the HSTS follow-up after verifying Vercel's two-year HSTS header on the apex redirect and primary host and confirming that the `.app` namespace is already HSTS-preloaded. [Reason why added: records why no application-level HSTS configuration or individual preload registration is needed.]

- 2026-07-22: Completed the optional TOTP and backup-code authentication rollout, including deployment-database migration, production smoke testing, and post-rollout monitoring. [Reason why added: records full production acceptance of the 2FA feature.]
