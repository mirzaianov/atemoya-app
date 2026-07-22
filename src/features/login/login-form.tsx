import { Field } from '@base-ui/react/field';
import clsx from 'clsx';
import { Eye, EyeOff, KeyRound, LogIn, UserPlus } from 'lucide-react';
import { useState } from 'react';
import type { FormEventHandler } from 'react';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';

import Button from '../../components/button';
import IconTooltip from '../../components/icon-tooltip';
import type { SignInFormValues } from '../auth/auth-schemas';
import type { VerificationNotice } from '../auth/email-verification';

import buttonStyles from '../../components/button.module.css';
import authStyles from '../auth/auth-page.module.css';
import formStyles from '../../styles/form.module.css';
import styles from './login-form.module.css';

const buttonSmall = 20;

interface Props {
  control: Control<SignInFormValues>;
  notice?: VerificationNotice;
  rootError?: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  isSubmitting: boolean;
  isValid: boolean;
  clearError: () => void;
  toForgotPassword: () => void;
  toSignup: () => void;
}

const LoginForm = ({
  onSubmit,
  control,
  notice,
  rootError,
  isSubmitting,
  isValid,
  clearError,
  toForgotPassword,
  toSignup,
}: Props) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const noticeRole = notice && (notice.tone === 'error' ? 'alert' : 'status');

  return (
    <>
      <h2 className={styles.subHeading}>Please, sign in</h2>
      <p className={styles.notice} data-tone={notice?.tone} role={noticeRole}>
        {notice?.message ?? ''}
      </p>
      <form onSubmit={onSubmit} noValidate>
        <Controller
          control={control}
          name="email"
          render={({
            field: { name, onBlur, onChange, ref, value },
            fieldState: { error, invalid, isDirty, isTouched },
          }) => (
            <Field.Root
              className={styles.formControl}
              dirty={isDirty}
              invalid={invalid}
              name={name}
              touched={isTouched}
            >
              <Field.Label className={styles.label}>
                <span className={styles.labelText}>Email</span>
              </Field.Label>
              <Field.Control
                autoComplete="username"
                className={styles.input}
                enterKeyHint="next"
                id="email"
                onBlur={onBlur}
                onValueChange={(nextValue) => {
                  onChange(nextValue);
                  clearError();
                }}
                placeholder="Enter email"
                ref={ref}
                type="email"
                value={value}
              />
              <Field.Error aria-live="polite" className={formStyles.error} match>
                {error?.message ?? ''}
              </Field.Error>
            </Field.Root>
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({
            field: { name, onBlur, onChange, ref, value },
            fieldState: { error, invalid, isDirty, isTouched },
          }) => (
            <Field.Root
              className={styles.formControl}
              dirty={isDirty}
              invalid={invalid || Boolean(rootError)}
              name={name}
              touched={isTouched}
            >
              <Field.Label className={styles.label}>
                <span className={styles.labelText}>Password</span>
              </Field.Label>
              <div className={formStyles.passwordControl}>
                <Field.Control
                  autoComplete="current-password"
                  className={clsx(styles.input, formStyles.passwordInput)}
                  enterKeyHint="done"
                  id="current-password"
                  onBlur={onBlur}
                  onValueChange={(nextValue) => {
                    onChange(nextValue);
                    clearError();
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
                    className={clsx(buttonStyles.button, formStyles.passwordToggle)}
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
                    {isPasswordVisible ? <Eye size={buttonSmall} /> : <EyeOff size={buttonSmall} />}
                  </button>
                </IconTooltip>
              </div>
              <Field.Error
                aria-live="polite"
                className={clsx(formStyles.error, formStyles.submitError)}
                match
              >
                {error?.message ?? rootError ?? ''}
              </Field.Error>
            </Field.Root>
          )}
        />
        <Button
          styling={clsx(
            buttonStyles.standard,
            buttonStyles.fullWidth,
            buttonStyles.primary,
            styles.signInButton,
          )}
          icon={<LogIn size={buttonSmall} />}
          text="Sign In"
          type="submit"
          disabled={!isValid}
          loading={isSubmitting}
        />
        <Button
          styling={clsx(
            buttonStyles.standard,
            buttonStyles.fullWidth,
            buttonStyles.neutral,
            styles.forgotPasswordButton,
          )}
          handleOnClick={toForgotPassword}
          icon={<KeyRound size={buttonSmall} />}
          text="Forgot Password?"
        />
      </form>
      <div className={authStyles.controlWidth}>
        <h2 className={styles.secondSubHeading}>Don&apos;t have an account?</h2>
        <Button
          styling={clsx(
            buttonStyles.standard,
            buttonStyles.fullWidth,
            buttonStyles.neutral,
            styles.createAccountButton,
          )}
          handleOnClick={toSignup}
          icon={<UserPlus size={buttonSmall} />}
          text="Sign Up"
        />
      </div>
    </>
  );
};

export default LoginForm;
