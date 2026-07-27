import type { VerificationNotice } from './email-verification';

export const passwordResetCallbackURL = '/reset-password';

type QueryValue = string | string[] | undefined;

const firstValue = (value: QueryValue) => (Array.isArray(value) ? value[0] : value);

export const getPasswordResetNotice = (reset?: QueryValue): VerificationNotice | undefined => {
  if (firstValue(reset) !== '1') {
    return undefined;
  }

  return {
    message: 'Password reset. Please sign in.',
    tone: 'success',
  };
};

export const getPasswordResetPageState = (token?: QueryValue, error?: QueryValue) => {
  const tokenValue = firstValue(token);

  if (firstValue(error) || !tokenValue) {
    return { status: 'invalid' as const };
  }

  return { status: 'ready' as const, token: tokenValue };
};

export type PasswordResetPageState = ReturnType<typeof getPasswordResetPageState>;
