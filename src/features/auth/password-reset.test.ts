import assert from 'node:assert/strict';
import test from 'node:test';

import { getPasswordResetErrorMessage } from './auth-error-messages.ts';
import { forgotPasswordSchema, resetPasswordSchema } from './auth-schemas.ts';
import { getPasswordResetNotice, getPasswordResetPageState } from './password-reset.ts';

test('validates forgot-password email', () => {
  assert.equal(
    forgotPasswordSchema.parse({ email: ' user@example.com ' }).email,
    'user@example.com',
  );
  assert.equal(forgotPasswordSchema.safeParse({ email: 'invalid' }).success, false);
});

test('validates reset passwords against the shared policy', () => {
  assert.equal(
    resetPasswordSchema.safeParse({ confirmPassword: 'password', newPassword: 'password' }).success,
    true,
  );
  assert.equal(
    resetPasswordSchema.safeParse({ confirmPassword: 'different', newPassword: 'password' })
      .success,
    false,
  );
  assert.equal(
    resetPasswordSchema.safeParse({ confirmPassword: 'short', newPassword: 'short' }).success,
    false,
  );
});

test('maps reset callback state and login notice', () => {
  assert.deepEqual(getPasswordResetPageState('token'), {
    status: 'ready',
    token: 'token',
  });
  assert.deepEqual(getPasswordResetPageState('token', 'INVALID_TOKEN'), { status: 'invalid' });
  assert.deepEqual(getPasswordResetPageState(), { status: 'invalid' });
  assert.deepEqual(getPasswordResetNotice('1'), {
    message: 'Password reset. Please sign in.',
    tone: 'success',
  });
  assert.equal(getPasswordResetNotice(), undefined);
});

test('maps reset endpoint errors', () => {
  assert.equal(
    getPasswordResetErrorMessage({ code: 'INVALID_TOKEN' }),
    'That reset link is invalid or has expired. Request a new one.',
  );
  assert.equal(
    getPasswordResetErrorMessage({ status: 429 }),
    'Too many reset attempts. Please wait and try again.',
  );
});
