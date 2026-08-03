import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { APIError, betterAuth } from 'better-auth';
import { twoFactor } from 'better-auth/plugins';
import { and, eq } from 'drizzle-orm';
import { after } from 'next/server';

import { db } from '../db/client';
import * as schema from '../db/schema';
import { sendAuthEmail } from './auth-email';
import {
  betterAuthDataProtectionFields,
  protectBetterAuthAdapter,
} from './better-auth-data-protection';
import { nicknameSchema } from './auth-nickname';
import { authBackupCodePolicy, authPasswordPolicy, authRateLimitPolicy } from './auth-policy';
import { getDataProtection } from './data-protection-config';
import { betterAuthLogger } from './security-logger';

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const isProduction = process.env.NODE_ENV === 'production';
const trustedDevOrigins = isProduction
  ? undefined
  : process.env.ALLOWED_DEV_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map((origin) => (origin.includes('://') ? origin : `http://${origin}:*`));

const validateNickname = (nickname: unknown) => {
  const parsed = nicknameSchema.safeParse(nickname);

  if (!parsed.success) {
    throw APIError.from('BAD_REQUEST', {
      code: 'INVALID_NICKNAME',
      message: parsed.error.issues[0]?.message ?? 'Invalid nickname',
    });
  }

  return parsed.data;
};

if (!betterAuthSecret) {
  throw new Error('BETTER_AUTH_SECRET is required.');
}

const vercelHosts = [
  process.env.VERCEL_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
].filter((host): host is string => Boolean(host));
const vercelFallbackHost =
  process.env.VERCEL_ENV === 'preview'
    ? process.env.VERCEL_URL
    : (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL);
const betterAuthFallbackUrl = vercelFallbackHost
  ? `https://${vercelFallbackHost}`
  : process.env.BETTER_AUTH_URL;

export const auth = betterAuth({
  advanced: {
    backgroundTasks: {
      handler: (promise) => after(() => promise),
    },
  },
  baseURL:
    vercelHosts.length > 0
      ? {
          allowedHosts: vercelHosts,
          fallback: betterAuthFallbackUrl,
          protocol: 'https',
        }
      : betterAuthFallbackUrl,
  database: protectBetterAuthAdapter(
    drizzleAdapter(db, {
      provider: 'pg',
      schema,
    }),
    getDataProtection(),
  ),
  databaseHooks: {
    user: {
      create: {
        before: (newUser) =>
          Promise.resolve({
            data: { ...newUser, name: validateNickname(newUser.name) },
          }),
      },
      update: {
        before: (userData) => {
          if (userData.name === undefined) {
            return Promise.resolve({ data: userData });
          }

          return Promise.resolve({
            data: { ...userData, name: validateNickname(userData.name) },
          });
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    maxPasswordLength: authPasswordPolicy.maxLength,
    minPasswordLength: authPasswordPolicy.minLength,
    onPasswordReset: async ({ user }) => {
      await db
        .delete(schema.verification)
        .where(
          and(
            eq(schema.verification.purpose, 'trust-device'),
            eq(schema.verification.subjectUserId, user.id),
          ),
        );

      after(() =>
        sendAuthEmail({
          subject: 'Your Atemoya password was changed',
          text: 'Your Atemoya password was changed. If you did not make this change, use the password reset flow immediately and review access to your email account.',
          to: user.email,
        }),
      );
    },
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 3600,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: ({ user, url }) =>
      sendAuthEmail({
        subject: 'Reset your Atemoya password',
        text: `Reset your Atemoya password by opening this link:\n\n${url}\n\nThis link expires in one hour. If you did not request this, you can ignore this email.`,
        to: user.email,
      }),
  },
  emailVerification: {
    autoSignInAfterVerification: false,
    expiresIn: 3600,
    sendOnSignIn: true,
    sendOnSignUp: true,
    sendVerificationEmail: ({ user, url }) =>
      sendAuthEmail({
        subject: 'Verify your Atemoya account',
        text: `Verify your Atemoya account by opening this link:\n\n${url}\n\nThis link expires in one hour.`,
        to: user.email,
      }),
  },
  logger: betterAuthLogger,
  plugins: [
    twoFactor({
      accountLockout: {
        durationSeconds: 900,
        enabled: true,
        maxFailedAttempts: 10,
      },
      backupCodeOptions: authBackupCodePolicy,
      issuer: 'Atemoya',
      trustDeviceMaxAge: 2_592_000,
      twoFactorCookieMaxAge: 600,
    }),
  ],
  rateLimit: {
    enabled: isProduction,
    max: authRateLimitPolicy.maxRequests,
    window: authRateLimitPolicy.windowSeconds,
  },
  secret: betterAuthSecret,
  session: betterAuthDataProtectionFields.session,
  trustedOrigins: trustedDevOrigins,
  user: {
    ...betterAuthDataProtectionFields.user,
    deleteUser: {
      enabled: true,
    },
  },
  verification: betterAuthDataProtectionFields.verification,
});
