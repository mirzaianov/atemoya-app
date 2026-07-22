'use client';

import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';

import Button from '../../components/button';
import { authClient } from '../../lib/auth-client';
import { passwordResetCallbackURL } from '../auth/password-reset';

import buttonStyles from '../../components/button.module.css';
import statusStyles from '../check-email/check-email.module.css';
import styles from './settings.module.css';

const iconSize = 20;
const resendCooldownMs = 30_000;

interface PasswordResetSettingsProps {
  userEmail: string;
}

interface Notice {
  message: string;
  tone: 'success' | 'error';
}

export default function PasswordResetSettings({ userEmail }: PasswordResetSettingsProps) {
  const [notice, setNotice] = useState<Notice>();
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const requestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.requestPasswordReset({
        email: userEmail,
        redirectTo: passwordResetCallbackURL,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    onError: () => {
      setNotice({
        message: 'We could not send a reset email. Please try again.',
        tone: 'error',
      });
    },
    onMutate: () => setNotice(undefined),
    onSuccess: () => {
      setNotice({
        message: 'A one-hour password reset link has been sent to your email.',
        tone: 'success',
      });
      setIsCoolingDown(true);
    },
  });

  useEffect(() => {
    if (!isCoolingDown) {
      return;
    }

    const timeout = window.setTimeout(() => setIsCoolingDown(false), resendCooldownMs);

    return () => window.clearTimeout(timeout);
  }, [isCoolingDown]);

  return (
    <>
      <Button
        disabled={isCoolingDown}
        handleOnClick={() => requestMutation.mutate()}
        icon={<Mail size={iconSize} />}
        loading={requestMutation.isPending}
        styling={clsx(
          buttonStyles.standard,
          buttonStyles.fullWidth,
          buttonStyles.primary,
          styles.passwordResetButton,
        )}
        text={isCoolingDown ? 'Email Sent' : 'Send Email'}
      />
      {notice ? (
        <p
          aria-live="polite"
          className={statusStyles.status}
          data-tone={notice.tone}
          role={notice.tone === 'error' ? 'alert' : 'status'}
        >
          {notice.message}
        </p>
      ) : null}
    </>
  );
}
