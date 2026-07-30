# Live Validation Border States Implementation Plan

> **For agentic workers:** Execute this plan task-by-task in the current Codex session. If available, use `superpowers:subagent-driven-development` or `superpowers:executing-plans`.

**Goal:** Add deliberate red and green border feedback to inputs that already provide real-time validation messages without changing validation behavior or globally styling every input.

**Architecture:** Reuse Base UI Field's existing `data-valid`, `data-invalid`, `data-dirty`, and `data-touched` attributes. Add two shared opt-in CSS classes: one for red and green client-validation feedback, and one for red-only credential feedback. Attach those classes explicitly to approved controls.

**Tech Stack:** Next.js 16, React 19, React Hook Form, Base UI Field, CSS Modules, Oxfmt, Oxlint, TypeScript.

## Global Constraints

- Keep existing validation schemas, timing, messages, and ARIA behavior unchanged.
- Do not use global input selectors.
- Show validation colors only after the field is dirty or touched.
- Keep the existing primary-colored focus outline.
- Use `var(--color-danger)` for invalid borders and `var(--color-success)` for valid borders.
- Transition only `border-color` and disable that transition under `prefers-reduced-motion`.
- Sign-in passwords and 2FA password/code fields are red-only; they must never show green before server verification.

---

### Task 1: Add Opt-In Validation Border Feedback

**Files:**

- Modify: `src/styles/form.module.css`
- Modify: `src/features/login/login-form.tsx`
- Modify: `src/features/signup/signup-form.tsx`
- Modify: `src/features/forgot-password/forgot-password.tsx`
- Modify: `src/features/reset-password/reset-password.tsx`
- Modify: `src/features/home/task-edit-dialog.tsx`
- Modify: `src/features/settings/nickname-edit-dialog.tsx`
- Modify: `src/features/two-factor/two-factor-challenge.tsx`
- Modify: `src/features/settings/two-factor-settings.tsx`
- Modify after implementation: `docs/state/recent-changes.md`

**Interfaces:**

- Consumes: Base UI Field control attributes `data-valid`, `data-invalid`, `data-dirty`, and `data-touched`.
- Produces: CSS Module classes `validationInput` for red/green feedback and `validationErrorInput` for red-only feedback.

- [x] **Step 1: Add the shared opt-in styles**

Add to `src/styles/form.module.css`:

```css
.validationInput,
.validationErrorInput {
  transition: border-color 160ms cubic-bezier(0.23, 1, 0.32, 1);
}

.validationInput[data-invalid]:is([data-dirty], [data-touched]),
.validationErrorInput[data-invalid]:is([data-dirty], [data-touched]) {
  border-color: var(--color-danger);
}

.validationInput[data-valid][data-dirty] {
  border-color: var(--color-success);
}
```

Add this reduced-motion media query:

```css
@media (prefers-reduced-motion: reduce) {
  .validationInput,
  .validationErrorInput {
    transition: none;
  }
}
```

- [x] **Step 2: Opt approved controls into red and green feedback**

Apply it only to:

- Sign In email: `clsx(styles.input, formStyles.validationInput)`.
- Sign Up nickname, email, and confirm email: `clsx(styles.input, formStyles.validationInput)`.
- Sign Up password and confirm password: `clsx(styles.input, formStyles.passwordInput, formStyles.validationInput)`.
- Forgot Password email: import `../../styles/form.module.css` as `validationStyles`, then use `clsx(formStyles.input, validationStyles.validationInput)`.
- Reset Password new password and confirm password: `clsx(formStyles.input, sharedFormStyles.passwordInput, sharedFormStyles.validationInput)`.
- Edit Task title: import `clsx` and `../../styles/form.module.css` as `validationStyles`, then use `clsx(inputStyles.input, validationStyles.validationInput)`.
- Edit Nickname: import `../../styles/form.module.css` as `validationStyles`, then use `clsx(styles.input, validationStyles.validationInput)`.

- [x] **Step 3: Opt credential-verification controls into red-only feedback**

Apply it only to:

- Sign In password: `clsx(styles.input, formStyles.passwordInput, formStyles.validationErrorInput)`.
- Two-Factor Challenge authenticator or backup code: import `clsx`, then use `clsx(styles.input, formStyles.validationErrorInput)`.
- Two-Factor Settings password confirmation and authenticator code: import `../../styles/form.module.css` as `validationStyles`, then use `clsx(styles.input, validationStyles.validationErrorInput)`.

Do not add either validation class to task creation, delete-account confirmation, locked settings fields, or check-email fields.

- [ ] **Step 4: Verify automated checks**

Run:

```powershell
pnpm format:check -- src/styles/form.module.css src/features/login/login-form.tsx src/features/signup/signup-form.tsx src/features/forgot-password/forgot-password.tsx src/features/reset-password/reset-password.tsx src/features/home/task-edit-dialog.tsx src/features/settings/nickname-edit-dialog.tsx src/features/two-factor/two-factor-challenge.tsx src/features/settings/two-factor-settings.tsx
pnpm lint
pnpm typecheck
git diff --check
```

Expected: every command exits successfully with no diagnostics.

- [ ] **Step 5: Verify the interaction matrix manually**

Check representative controls:

- Untouched controls remain neutral.
- Invalid dirty or touched controls show a danger border and retain their text error.
- Valid dirty approved controls show a success border.
- Sign-in password and 2FA controls return to neutral or focused-primary when locally valid; they never turn green.
- Focus outlines remain primary-colored while validation changes only the border.
- With reduced motion enabled, border colors change without a transition.

- [ ] **Step 6: Sync project state**

Add one reverse-chronological entry to `docs/state/recent-changes.md` describing the deliberate opt-in validation borders and why credentials remain red-only. Leave `current-status.md` and `next-steps.md` unchanged unless repository reality changes during implementation.

- [ ] **Step 7: Prepare the focused commit**

Review the final diff and propose:

```text
feat(ATE-52): Add input validation borders
```

Do not stage or commit without explicit user approval.
