'use client';

import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';

import Button from '../../components/button';
import Spinner from '../../components/spinner';
import { authClient } from '../../lib/auth-client';
import { passwordResetCallbackURL } from '../auth/password-reset';

import buttonStyles from '../../components/button.module.css';
import statusStyles from '../check-email/check-email.module.css';
import styles from './settings.module.css';

const iconSize = 20;
const resendCooldownSeconds = 30;

interface PasswordResetSettingsProps {
  userEmail: string;
}

interface Notice {
  message: string;
  tone: 'success' | 'error';
}

export default function PasswordResetSettings({ userEmail }: PasswordResetSettingsProps) {
  const [notice, setNotice] = useState<Notice>();
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const isCoolingDown = cooldownSeconds > 0;
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
        message: 'Reset email sent. Check your inbox.',
        tone: 'success',
      });
      setCooldownSeconds(resendCooldownSeconds);
    },
  });

  useEffect(() => {
    if (cooldownSeconds === 0) {
      return;
    }

    const timeout = window.setTimeout(
      () => setCooldownSeconds((currentSeconds) => Math.max(0, currentSeconds - 1)),
      1000,
    );

    return () => window.clearTimeout(timeout);
  }, [cooldownSeconds]);

  return (
    <>
      <span className={clsx(styles.fieldLabel, styles.passwordResetLabel)}>Reset password</span>
      <Button
        disabled={isCoolingDown}
        handleOnClick={() => requestMutation.mutate()}
        icon={isCoolingDown ? <Spinner size={iconSize} /> : <Mail size={iconSize} />}
        loading={requestMutation.isPending}
        styling={clsx(buttonStyles.standard, buttonStyles.fullWidth, buttonStyles.primary)}
        text={isCoolingDown ? `Send again in ${cooldownSeconds}s` : 'Send Reset'}
        textContent={
          isCoolingDown ? (
            <span>
              Send again in <span className={buttonStyles.countdown}>{cooldownSeconds}</span>s
            </span>
          ) : undefined
        }
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
