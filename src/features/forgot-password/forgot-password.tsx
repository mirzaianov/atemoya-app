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
    onMutate: () => setNotice(undefined),
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
      <div className={clsx(authStyles.formContainer, styles.content)}>
        <h2 className={clsx(formStyles.subHeading, styles.heading)}>Reset Password</h2>
        <p className={styles.description}>
          Enter your account email and we will send a one-hour reset link.
        </p>
        <div className={styles.actions}>
          <form className={styles.form} onSubmit={submit} noValidate>
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
                  <div className={styles.fieldBody}>
                    <Field.Control
                      autoComplete="username"
                      autoFocus
                      className={formStyles.input}
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
                    <div className={styles.messageArea}>
                      {error ? (
                        <Field.Error
                          aria-live="polite"
                          className={clsx(styles.message, styles.errorMessage)}
                          match
                        >
                          {error.message}
                        </Field.Error>
                      ) : null}
                      {!error && notice ? (
                        <div
                          aria-live="polite"
                          className={clsx(styles.message, styles.statusMessage)}
                          data-tone={notice.tone}
                          role={notice.tone === 'error' ? 'alert' : 'status'}
                        >
                          {notice.message}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Field.Root>
              )}
            />
            <Button
              styling={clsx(buttonStyles.standard, buttonStyles.fullWidth, buttonStyles.primary)}
              icon={isCoolingDown ? <Spinner size={iconSize} /> : <Mail size={iconSize} />}
              text={isCoolingDown ? `Send again in ${cooldownSeconds}s` : 'Send Reset'}
              textContent={
                isCoolingDown ? (
                  <span>
                    Send again in <span className={buttonStyles.countdown}>{cooldownSeconds}</span>s
                  </span>
                ) : undefined
              }
              type="submit"
              disabled={!form.formState.isValid || isCoolingDown}
              loading={requestMutation.isPending}
            />
          </form>
          <Button
            styling={clsx(buttonStyles.standard, buttonStyles.fullWidth, buttonStyles.neutral)}
            handleOnClick={() => router.push('/login')}
            icon={<ArrowLeft size={iconSize} />}
            text="Back to Login"
          />
        </div>
      </div>
    </div>
  );
}
