'use client';

import { Field } from '@base-ui/react/field';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowLeft, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import BrandHeader from '../../components/brand-header';
import Button from '../../components/button';
import Spinner from '../../components/spinner';
import { authClient } from '../../lib/auth-client';
import { forgotPasswordSchema } from '../auth/auth-schemas';
import type { ForgotPasswordFormValues } from '../auth/auth-schemas';
import { passwordResetCallbackURL } from '../auth/password-reset';

import buttonStyles from '../../components/button.module.css';
import authStyles from '../auth/auth-page.module.css';
import statusStyles from '../check-email/check-email.module.css';
import formStyles from '../signup/signup-form.module.css';
import styles from './forgot-password.module.css';

const iconSize = 20;
const resendCooldownSeconds = 30;

interface Notice {
  message: string;
  tone: 'success' | 'error';
}

export default function ForgotPassword() {
  const router = useRouter();
  const form = useForm<ForgotPasswordFormValues>({
    defaultValues: { email: '' },
    mode: 'onChange',
    resolver: zodResolver(forgotPasswordSchema),
  });
  const [notice, setNotice] = useState<Notice>();
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const isCoolingDown = cooldownSeconds > 0;
  const requestMutation = useMutation({
    mutationFn: async ({ email }: ForgotPasswordFormValues) => {
      const { error } = await authClient.requestPasswordReset({
        email,
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
    onSuccess: () => {
      setNotice({
        message: 'If an account uses this email, a one-hour reset link has been sent.',
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

  const submit = form.handleSubmit((values) => requestMutation.mutateAsync(values));

  return (
    <div className={authStyles.container}>
      <BrandHeader />
      <div className={authStyles.formContainer}>
        <h2 className={formStyles.subHeading}>Reset Password</h2>
        <p className={statusStyles.description}>
          Enter your account email and we will send a one-hour reset link.
        </p>
        <form className={authStyles.fullWidthForm} onSubmit={submit} noValidate>
          <Controller
            control={form.control}
            name="email"
            render={({
              field: { name, onBlur, onChange, ref, value },
              fieldState: { error, invalid, isDirty, isTouched },
            }) => (
              <Field.Root
                className={formStyles.formControl}
                dirty={isDirty}
                invalid={invalid}
                name={name}
                touched={isTouched}
              >
                <Field.Label className={formStyles.label}>
                  <span className={formStyles.labelText}>Email</span>
                </Field.Label>
                <Field.Control
                  autoComplete="username"
                  autoFocus
                  className={clsx(formStyles.input, formStyles.fullWidthInput)}
                  enterKeyHint="send"
                  id="reset-email"
                  onBlur={onBlur}
                  onValueChange={(nextEmail) => {
                    onChange(nextEmail);
                    setNotice(undefined);
                  }}
                  placeholder="Enter email"
                  ref={ref}
                  type="email"
                  value={value}
                />
                <div className={clsx(styles.messageLine, styles.errorLine)}>
                  <Field.Error aria-live="polite" match>
                    {error?.message ?? ''}
                  </Field.Error>
                </div>
              </Field.Root>
            )}
          />
          <p
            aria-live="polite"
            className={clsx(styles.messageLine, styles.statusLine)}
            data-tone={notice?.tone}
            role={notice?.tone === 'error' ? 'alert' : 'status'}
          >
            {notice?.message ?? ''}
          </p>
          <Button
            styling={clsx(buttonStyles.standard, buttonStyles.fullWidth, buttonStyles.primary)}
            icon={isCoolingDown ? <Spinner size={iconSize} /> : <Mail size={iconSize} />}
            text={isCoolingDown ? `${cooldownSeconds}s` : 'Send Reset'}
            type="submit"
            disabled={!form.formState.isValid || isCoolingDown}
            loading={requestMutation.isPending}
          />
        </form>
        <Button
          styling={clsx(
            buttonStyles.standard,
            buttonStyles.fullWidth,
            buttonStyles.neutral,
            statusStyles.backButton,
          )}
          handleOnClick={() => router.push('/login')}
          icon={<ArrowLeft size={iconSize} />}
          text="Back to Login"
        />
      </div>
    </div>
  );
}
