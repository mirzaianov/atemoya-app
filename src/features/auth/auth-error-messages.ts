interface AuthError {
  code?: string;
  status?: number;
  message?: string;
}

export const getSignInErrorMessage = (error: AuthError) => {
  if (error.status === 429) {
    return 'Too many sign-in attempts. Please wait and try again.';
  }

  if (error.code === 'EMAIL_NOT_VERIFIED') {
    return 'Please verify your email before signing in.';
  }

  if (error.code === 'INVALID_EMAIL_OR_PASSWORD' || error.status === 401) {
    return 'Email or password is invalid. Please check them.';
  }

  return 'We could not sign you in. Please try again.';
};

export const getSignUpErrorMessage = (error: AuthError) => {
  if (error.status === 429) {
    return 'Too many sign-up attempts. Please wait and try again.';
  }

  if (error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' || error.status === 422) {
    return 'This email is already registered. Try signing in instead.';
  }

  if (error.code === 'INVALID_EMAIL') {
    return 'Email is invalid. Please check it and try again.';
  }

  return 'We could not create your account. Please check your details and try again.';
};

export const getSignUpPasswordErrorMessage = (error: AuthError) => {
  if (error.code === 'PASSWORD_TOO_SHORT') {
    return 'Password is too short';
  }

  if (error.code === 'PASSWORD_TOO_LONG') {
    return 'Password is too long';
  }

  if (error.code === 'INVALID_PASSWORD') {
    return 'Password is invalid';
  }

  return null;
};

export const getPasswordResetErrorMessage = (error: AuthError) => {
  if (error.status === 429) {
    return 'Too many reset attempts. Please wait and try again.';
  }

  if (error.code === 'INVALID_TOKEN') {
    return 'That reset link is invalid or has expired. Request a new one.';
  }

  if (error.code === 'PASSWORD_TOO_SHORT') {
    return 'Password is too short';
  }

  if (error.code === 'PASSWORD_TOO_LONG') {
    return 'Password is too long';
  }

  return 'We could not reset your password. Please try again.';
};
