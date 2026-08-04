import { Field } from '@base-ui/react/field';
import clsx from 'clsx';
import { ArrowLeft, Eye, EyeClosed, UserPlus } from 'lucide-react';
import { useState } from 'react';
import type { FormEventHandler } from 'react';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';

import Button from '../../components/button';
import IconTooltip from '../../components/icon-tooltip';
import type { SignUpFormValues } from '../auth/auth-schemas';

import buttonStyles from '../../components/button.module.css';
import authStyles from '../auth/auth-page.module.css';
import formStyles from '../../styles/form.module.css';
import styles from './signup-form.module.css';

const buttonSmall = 20;

interface Props {
  control: Control<SignUpFormValues>;
  rootError?: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  isSubmitting: boolean;
  isValid: boolean;
  clearError: () => void;
  toLogin: () => void;
}

const SignupForm = ({
  control,
  rootError,
  onSubmit,
  isSubmitting,
  isValid,
  clearError,
  toLogin,
}: Props) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);

  return (
    <>
      <h2 className={styles.subHeading}>Sign Up</h2>
      <form onSubmit={onSubmit} noValidate>
        <Controller
          control={control}
          name="nickname"
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
                <span className={styles.labelText}>Nickname</span>
              </Field.Label>
              <Field.Control
                autoComplete="off"
                className={clsx(styles.input, formStyles.validationInput)}
                enterKeyHint="next"
                id="nickname"
                onBlur={onBlur}
                onValueChange={(nextValue) => {
                  onChange(nextValue);
                  clearError();
                }}
                placeholder="Enter nickname"
                ref={ref}
                type="text"
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
                className={clsx(styles.input, formStyles.validationInput)}
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
          name="confirmEmail"
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
                <span className={styles.labelText}>Confirm Email</span>
              </Field.Label>
              <Field.Control
                autoComplete="email"
                className={clsx(styles.input, formStyles.validationInput)}
                enterKeyHint="next"
                id="emailConfirm"
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
              invalid={invalid}
              name={name}
              touched={isTouched}
            >
              <Field.Label className={styles.label}>
                <span className={styles.labelText}>Password</span>
              </Field.Label>
              <div className={formStyles.passwordControl}>
                <Field.Control
                  autoComplete="new-password"
                  className={clsx(
                    styles.input,
                    formStyles.passwordInput,
                    formStyles.validationInput,
                  )}
                  enterKeyHint="next"
                  id="new-password"
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
                    {isPasswordVisible ? (
                      <EyeClosed size={buttonSmall} />
                    ) : (
                      <Eye size={buttonSmall} />
                    )}
                  </button>
                </IconTooltip>
              </div>
              <Field.Error aria-live="polite" className={formStyles.error} match>
                {error?.message ?? ''}
              </Field.Error>
            </Field.Root>
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
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
                <span className={styles.labelText}>Confirm Password</span>
              </Field.Label>
              <div className={formStyles.passwordControl}>
                <Field.Control
                  autoComplete="new-password"
                  className={clsx(
                    styles.input,
                    formStyles.passwordInput,
                    formStyles.validationInput,
                  )}
                  enterKeyHint="done"
                  id="confirm-password"
                  onBlur={onBlur}
                  onValueChange={(nextValue) => {
                    onChange(nextValue);
                    clearError();
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
                    className={clsx(buttonStyles.button, formStyles.passwordToggle)}
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
                      <EyeClosed size={buttonSmall} />
                    ) : (
                      <Eye size={buttonSmall} />
                    )}
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
            styles.registerButton,
          )}
          icon={<UserPlus size={buttonSmall} />}
          text="Sign Up"
          type="submit"
          disabled={!isValid}
          loading={isSubmitting}
        />
      </form>
      <Button
        styling={clsx(
          buttonStyles.standard,
          buttonStyles.fullWidth,
          buttonStyles.neutral,
          authStyles.controlWidth,
          styles.goBackButton,
        )}
        handleOnClick={toLogin}
        icon={<ArrowLeft size={buttonSmall} />}
        text="Back to Login"
      />
    </>
  );
};

export default SignupForm;
