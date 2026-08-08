'use client';

import { Field } from '@base-ui/react/field';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowLeft, Eye, EyeClosed, KeyRound, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';

import BrandHeader from '../../components/brand-header';
import Button from '../../components/button';
import IconTooltip from '../../components/icon-tooltip';
import { authClient } from '../../lib/auth-client';
import { getPasswordResetErrorMessage } from '../auth/auth-error-messages';
import { resetPasswordSchema } from '../auth/auth-schemas';
import type { ResetPasswordFormValues } from '../auth/auth-schemas';
import type { PasswordResetPageState } from '../auth/password-reset';

import buttonStyles from '../../components/button.module.css';
import sharedFormStyles from '../../styles/form.module.css';
import authStyles from '../auth/auth-page.module.css';
import statusStyles from '../check-email/check-email.module.css';
import formStyles from '../signup/signup-form.module.css';

const iconSize = 20;

interface Props {
  state: PasswordResetPageState;
}

export default function ResetPassword({ state }: Props) {
  const router = useRouter();
  const [isNavigationPending, startNavigation] = useTransition();
  const form = useForm<ResetPasswordFormValues>({
    defaultValues: { confirmPassword: '', newPassword: '' },
    mode: 'onChange',
    resolver: zodResolver(resetPasswordSchema),
  });
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [isTokenInvalid, setIsTokenInvalid] = useState(false);
  const token = state.status === 'ready' ? state.token : '';
  const resetMutation = useMutation({
    mutationFn: async ({ newPassword }: ResetPasswordFormValues) => {
      const { error } = await authClient.resetPassword({ newPassword, token });

      if (error) {
        if (error.code === 'INVALID_TOKEN') {
          setIsTokenInvalid(true);

          return;
        }

        form.setError('root', { message: getPasswordResetErrorMessage(error) });

        return;
      }

      startNavigation(() => router.replace('/login?reset=1'));
    },
    onError: () => {
      form.setError('root', {
        message: 'We could not reset your password. Please try again.',
      });
    },
  });
  const submit = form.handleSubmit((values) => resetMutation.mutateAsync(values));

  if (state.status === 'invalid' || isTokenInvalid) {
    return (
      <div className={authStyles.container}>
        <BrandHeader />
        <div className={authStyles.formContainer}>
          <h2 className={formStyles.subHeading}>Reset Link Invalid</h2>
          <p className={statusStyles.description}>
            This reset link is invalid, expired, or already used. Request a new email to continue.
          </p>
          <Button
            styling={clsx(buttonStyles.standard, buttonStyles.primary, statusStyles.backButton)}
            handleOnClick={() => router.push('/forgot-password')}
            icon={<Mail size={iconSize} />}
            text="Request New Link"
          />
          <Button
            styling={clsx(buttonStyles.standard, buttonStyles.neutral, statusStyles.backButton)}
            handleOnClick={() => router.push('/login')}
            icon={<ArrowLeft size={iconSize} />}
            text="Back to Login"
          />
        </div>
      </div>
    );
  }

  const rootError = form.formState.errors.root?.message;

  return (
    <div className={authStyles.container}>
      <BrandHeader />
      <div className={authStyles.formContainer}>
        <h2 className={formStyles.subHeading}>Choose New Password</h2>
        <p className={statusStyles.description}>Use between 8 and 128 characters.</p>
        <form onSubmit={submit} noValidate>
          <Controller
            control={form.control}
            name="newPassword"
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
                  <span className={formStyles.labelText}>New Password</span>
                </Field.Label>
                <div className={sharedFormStyles.passwordControl}>
                  <Field.Control
                    autoComplete="new-password"
                    autoFocus
                    className={clsx(
                      formStyles.input,
                      sharedFormStyles.passwordInput,
                      sharedFormStyles.validationInput,
                    )}
                    enterKeyHint="next"
                    id="new-password"
                    onBlur={onBlur}
                    onValueChange={(nextPassword) => {
                      onChange(nextPassword);
                      form.clearErrors('root');
                    }}
                    placeholder="Enter password"
                    ref={ref}
                    type={isPasswordVisible ? 'text' : 'password'}
                    value={value}
                  />
                  <IconTooltip label={isPasswordVisible ? 'Hide password' : 'Show password'}>
                    <button
                      aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                      aria-pressed={isPasswordVisible}
                      className={clsx(buttonStyles.button, sharedFormStyles.passwordToggle)}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        setIsPasswordVisible((visible) => !visible);
                      }}
                      onClick={(event) => {
                        if (event.detail === 0) {
                          setIsPasswordVisible((visible) => !visible);
                        }
                      }}
                      type="button"
                    >
                      {isPasswordVisible ? <EyeClosed size={iconSize} /> : <Eye size={iconSize} />}
                    </button>
                  </IconTooltip>
                </div>
                <Field.Error aria-live="polite" className={sharedFormStyles.error} match>
                  {error?.message ?? ''}
                </Field.Error>
              </Field.Root>
            )}
          />
          <Controller
            control={form.control}
            name="confirmPassword"
            render={({
              field: { name, onBlur, onChange, ref, value },
              fieldState: { error, invalid, isDirty, isTouched },
            }) => (
              <Field.Root
                className={formStyles.formControl}
                dirty={isDirty}
                invalid={invalid || Boolean(rootError)}
                name={name}
                touched={isTouched}
              >
                <Field.Label className={formStyles.label}>
                  <span className={formStyles.labelText}>Confirm Password</span>
                </Field.Label>
                <div className={sharedFormStyles.passwordControl}>
                  <Field.Control
                    autoComplete="new-password"
                    className={clsx(
                      formStyles.input,
                      sharedFormStyles.passwordInput,
                      sharedFormStyles.validationInput,
                    )}
                    enterKeyHint="done"
                    id="confirm-password"
                    onBlur={onBlur}
                    onValueChange={(nextPassword) => {
                      onChange(nextPassword);
                      form.clearErrors('root');
                    }}
                    placeholder="Enter password"
                    ref={ref}
                    type={isConfirmationVisible ? 'text' : 'password'}
                    value={value}
                  />
                  <IconTooltip
                    label={
                      isConfirmationVisible
                        ? 'Hide password confirmation'
                        : 'Show password confirmation'
                    }
                  >
                    <button
                      aria-label={
                        isConfirmationVisible
                          ? 'Hide password confirmation'
                          : 'Show password confirmation'
                      }
                      aria-pressed={isConfirmationVisible}
                      className={clsx(buttonStyles.button, sharedFormStyles.passwordToggle)}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        setIsConfirmationVisible((visible) => !visible);
                      }}
                      onClick={(event) => {
                        if (event.detail === 0) {
                          setIsConfirmationVisible((visible) => !visible);
                        }
                      }}
                      type="button"
                    >
                      {isConfirmationVisible ? (
                        <EyeClosed size={iconSize} />
                      ) : (
                        <Eye size={iconSize} />
                      )}
                    </button>
                  </IconTooltip>
                </div>
                <Field.Error
                  aria-live="polite"
                  className={clsx(sharedFormStyles.error, sharedFormStyles.submitError)}
                  match
                >
                  {error?.message ?? rootError ?? ''}
                </Field.Error>
              </Field.Root>
            )}
          />
          <Button
            styling={clsx(buttonStyles.standard, buttonStyles.primary, formStyles.registerButton)}
            icon={<KeyRound size={iconSize} />}
            text="Reset Password"
            type="submit"
            disabled={!form.formState.isValid}
            loading={resetMutation.isPending || isNavigationPending}
          />
        </form>
        <Button
          styling={clsx(buttonStyles.standard, buttonStyles.neutral, statusStyles.backButton)}
          handleOnClick={() => router.push('/login')}
          icon={<ArrowLeft size={iconSize} />}
          text="Back to Login"
        />
      </div>
    </div>
  );
}
