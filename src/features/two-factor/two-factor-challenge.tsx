'use client';

import { Field } from '@base-ui/react/field';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { KeyRound, LogIn, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import BrandHeader from '../../components/brand-header';
import Button from '../../components/button';
import { authClient } from '../../lib/auth-client';
import { getTwoFactorErrorMessage, isExpiredTwoFactorChallenge } from '../auth/two-factor-errors';

import buttonStyles from '../../components/button.module.css';
import formStyles from '../../styles/form.module.css';
import pageStyles from '../auth/auth-page.module.css';
import styles from './two-factor-challenge.module.css';

const iconSize = 20;
const totpSchema = z.object({
  code: z.string().regex(/^\d{6}$/u, 'Enter the six-digit code.'),
  trustDevice: z.boolean(),
});
const backupCodeSchema = z.object({
  code: z.string().trim().min(1, 'Enter a backup code.'),
  trustDevice: z.boolean(),
});

type ChallengeMode = 'totp' | 'backup';
type ChallengeValues = z.infer<typeof totpSchema>;

export default function TwoFactorChallenge() {
  const [mode, setMode] = useState<ChallengeMode>('totp');
  const router = useRouter();
  const form = useForm<ChallengeValues>({
    defaultValues: { code: '', trustDevice: false },
    mode: 'onChange',
  });
  const code = useWatch({ control: form.control, name: 'code' });
  const verifyMutation = useMutation({
    mutationFn: ({
      challengeMode,
      values,
    }: {
      challengeMode: ChallengeMode;
      values: ChallengeValues;
    }) =>
      challengeMode === 'totp'
        ? authClient.twoFactor.verifyTotp(values)
        : authClient.twoFactor.verifyBackupCode({
            code: values.code,
            disableSession: false,
            trustDevice: values.trustDevice,
          }),
  });

  useEffect(() => {
    form.setFocus('code');
  }, [form, mode]);

  const switchMode = () => {
    setMode((currentMode) => (currentMode === 'totp' ? 'backup' : 'totp'));
    form.reset({ code: '', trustDevice: false });
  };

  const submit = form.handleSubmit(async (values) => {
    form.clearErrors('root');

    const parsed = (mode === 'totp' ? totpSchema : backupCodeSchema).safeParse(values);

    if (!parsed.success) {
      form.setError('code', { message: parsed.error.issues[0]?.message ?? 'Enter a code.' });

      return;
    }

    const { error } = await verifyMutation.mutateAsync({
      challengeMode: mode,
      values: parsed.data,
    });

    if (error) {
      if (isExpiredTwoFactorChallenge(error.code)) {
        router.replace('/login');

        return;
      }

      form.setError('root', { message: getTwoFactorErrorMessage(error.code) });

      return;
    }

    router.replace('/');
    router.refresh();
  });
  const isCodeValid = mode === 'totp' ? /^\d{6}$/u.test(code) : code.trim().length > 0;
  const rootError = form.formState.errors.root?.message;

  return (
    <div className={pageStyles.container}>
      <BrandHeader />
      <div className={pageStyles.formContainer}>
        <h2 className={styles.heading}>Two-factor authentication</h2>
        <p className={styles.description}>
          {mode === 'totp'
            ? 'Enter the code from your authenticator app.'
            : 'Enter one unused backup code.'}
        </p>
        <form className={styles.form} noValidate onSubmit={submit}>
          <Controller
            control={form.control}
            name="code"
            render={({ field, fieldState }) => (
              <Field.Root
                className={styles.formControl}
                invalid={fieldState.invalid || Boolean(rootError)}
                name={field.name}
                touched={fieldState.isTouched}
              >
                <Field.Label className={styles.label}>
                  {mode === 'totp' ? 'Authenticator code' : 'Backup code'}
                </Field.Label>
                <Field.Control
                  autoComplete={mode === 'totp' ? 'one-time-code' : 'off'}
                  className={clsx(styles.input, formStyles.validationErrorInput)}
                  inputMode={mode === 'totp' ? 'numeric' : 'text'}
                  maxLength={mode === 'totp' ? 6 : undefined}
                  onBlur={() => field.onBlur()}
                  onValueChange={(value) => {
                    field.onChange(mode === 'totp' ? (value.match(/\d/gu)?.join('') ?? '') : value);
                    form.clearErrors();
                  }}
                  ref={field.ref}
                  type="text"
                  value={field.value}
                />
                <Field.Error
                  className={clsx(formStyles.error, styles.error)}
                  match={Boolean(fieldState.error?.message ?? rootError)}
                  role="alert"
                >
                  {fieldState.error?.message ?? rootError ?? ''}
                </Field.Error>
              </Field.Root>
            )}
          />
          <label className={styles.trustDevice}>
            <input type="checkbox" {...form.register('trustDevice')} />
            Trust this device for 30 days
          </label>
          <Button
            disabled={!isCodeValid}
            icon={<LogIn size={iconSize} />}
            loading={verifyMutation.isPending}
            styling={clsx(buttonStyles.standard, buttonStyles.fullWidth, buttonStyles.primary)}
            text="Verify and Sign In"
            type="submit"
          />
          <Button
            disabled={verifyMutation.isPending}
            handleOnClick={switchMode}
            icon={mode === 'totp' ? <KeyRound size={iconSize} /> : <RotateCcw size={iconSize} />}
            styling={clsx(buttonStyles.standard, buttonStyles.fullWidth, buttonStyles.neutral)}
            text={mode === 'totp' ? 'Use a Backup Code' : 'Use Authenticator Code'}
          />
        </form>
      </div>
    </div>
  );
}
