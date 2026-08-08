'use client';

import { Dialog } from '@base-ui/react/dialog';
import { Field } from '@base-ui/react/field';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { Copy, Download, KeyRound, RefreshCw, ShieldCheck, ShieldOff, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import QRCode from 'react-qr-code';
import { z } from 'zod';

import Button from '../../components/button';
import ModalLayout from '../../components/modal-layout';
import { toast } from '../../components/toast-provider';
import { authClient } from '../../lib/auth-client';
import { getTwoFactorErrorMessage } from '../auth/two-factor-errors';

import buttonStyles from '../../components/button.module.css';
import formStyles from '../../components/modal-form-layout.module.css';
import validationStyles from '../../styles/form.module.css';
import styles from './settings.module.css';

const iconSize = 20;
const passwordFormSchema = z.object({ password: z.string().min(1, 'Enter your password.') });
const totpFormSchema = z.object({
  code: z.string().regex(/^\d{6}$/u, 'Enter the six-digit code.'),
});

type Flow = 'setup' | 'regenerate' | 'disable';
type Step = 'password' | 'totp' | 'codes';
type PasswordFormValues = z.infer<typeof passwordFormSchema>;
type TotpFormValues = z.infer<typeof totpFormSchema>;

interface TwoFactorSettingsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

const getDialogTitle = (flow: Flow, step: Step) => {
  if (step === 'codes') {
    return 'Save Backup Codes';
  }

  if (flow === 'disable') {
    return 'Disable Two-Factor Authentication';
  }

  if (flow === 'regenerate') {
    return 'Regenerate Backup Codes';
  }

  return 'Set Up Two-Factor Authentication';
};

const getPasswordDescription = (flow: Flow) => {
  if (flow === 'disable') {
    return 'Confirm your password to remove authenticator and trusted-device access.';
  }

  if (flow === 'regenerate') {
    return 'Confirm your password. Existing backup codes will stop working.';
  }

  return 'Confirm your password before linking an authenticator app.';
};

const revokeOtherSessions = async () => {
  const { error } = await authClient.revokeOtherSessions();

  if (error) {
    toast.error('Two-factor settings changed, but other sessions could not be revoked.');

    return false;
  }

  return true;
};

export default function TwoFactorSettings({ enabled, onEnabledChange }: TwoFactorSettingsProps) {
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [codesSaved, setCodesSaved] = useState(false);
  const [flow, setFlow] = useState<Flow>('setup');
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>('password');
  const [totpUri, setTotpUri] = useState('');
  const router = useRouter();
  const passwordForm = useForm<PasswordFormValues>({
    defaultValues: { password: '' },
    mode: 'onChange',
    resolver: zodResolver(passwordFormSchema),
  });
  const totpForm = useForm<TotpFormValues>({
    defaultValues: { code: '' },
    mode: 'onChange',
    resolver: zodResolver(totpFormSchema),
  });
  const enableMutation = useMutation({
    mutationFn: (password: string) => authClient.twoFactor.enable({ password }),
  });
  const verifyMutation = useMutation({
    mutationFn: (code: string) => authClient.twoFactor.verifyTotp({ code }),
  });
  const regenerateMutation = useMutation({
    mutationFn: (password: string) => authClient.twoFactor.generateBackupCodes({ password }),
  });
  const disableMutation = useMutation({
    mutationFn: (password: string) => authClient.twoFactor.disable({ password }),
  });
  const isPending =
    enableMutation.isPending ||
    verifyMutation.isPending ||
    regenerateMutation.isPending ||
    disableMutation.isPending;
  const requiresSavedConfirmation = step === 'codes' && !codesSaved;
  const manualKey = totpUri ? new URL(totpUri).searchParams.get('secret') : '';

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (step === 'password') {
      passwordForm.setFocus('password');
    } else if (step === 'totp') {
      totpForm.setFocus('code');
    }
  }, [isOpen, passwordForm, step, totpForm]);

  const resetDialog = () => {
    setBackupCodes([]);
    setCodesSaved(false);
    setStep('password');
    setTotpUri('');
    passwordForm.reset({ password: '' });
    totpForm.reset({ code: '' });
    enableMutation.reset();
    verifyMutation.reset();
    regenerateMutation.reset();
    disableMutation.reset();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && (isPending || requiresSavedConfirmation)) {
      return;
    }

    setIsOpen(open);

    if (!open) {
      resetDialog();
    }
  };

  const openFlow = (nextFlow: Flow) => {
    resetDialog();
    setFlow(nextFlow);
    setIsOpen(true);
  };

  const submitPassword = passwordForm.handleSubmit(async ({ password }) => {
    passwordForm.clearErrors('root');

    if (flow === 'setup') {
      const { data, error } = await enableMutation.mutateAsync(password);

      if (error || !data) {
        passwordForm.setError('root', { message: getTwoFactorErrorMessage(error?.code) });

        return;
      }

      setBackupCodes(data.backupCodes);
      setTotpUri(data.totpURI);
      setStep('totp');

      return;
    }

    if (flow === 'regenerate') {
      const { data, error } = await regenerateMutation.mutateAsync(password);

      if (error || !data) {
        passwordForm.setError('root', { message: getTwoFactorErrorMessage(error?.code) });

        return;
      }

      setBackupCodes(data.backupCodes);
      setStep('codes');

      return;
    }

    const { error } = await disableMutation.mutateAsync(password);

    if (error) {
      passwordForm.setError('root', { message: getTwoFactorErrorMessage(error.code) });

      return;
    }

    const sessionsRevoked = await revokeOtherSessions();

    onEnabledChange(false);
    setIsOpen(false);
    resetDialog();
    router.refresh();

    if (sessionsRevoked) {
      toast.success('Two-factor authentication disabled');
    }
  });

  const submitTotp = totpForm.handleSubmit(async ({ code }) => {
    const { error } = await verifyMutation.mutateAsync(code);

    if (error) {
      totpForm.setError('root', { message: getTwoFactorErrorMessage(error.code) });

      return;
    }

    const sessionsRevoked = await revokeOtherSessions();

    onEnabledChange(true);
    setStep('codes');
    router.refresh();

    if (sessionsRevoked) {
      toast.success('Two-factor authentication enabled');
    }
  });

  const copyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      toast.info('Backup codes copied');
    } catch {
      toast.error('Backup codes could not be copied.');
    }
  };

  const downloadBackupCodes = () => {
    const url = URL.createObjectURL(
      new Blob([[...backupCodes, ''].join('\n')], { type: 'text/plain;charset=utf-8' }),
    );
    const link = document.createElement('a');

    link.download = 'atemoya-backup-codes.txt';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const passwordError = passwordForm.formState.errors.root?.message;
  const totpError = totpForm.formState.errors.root?.message;

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <div className={styles.securityControl}>
        <div className={styles.securityStatus}>
          <span>Two-factor authentication</span>
          <strong data-enabled={enabled}>{enabled ? 'Enabled' : 'Disabled'}</strong>
        </div>
        {enabled ? (
          <div className={styles.optionRow}>
            <Button
              handleOnClick={() => openFlow('disable')}
              icon={<ShieldOff size={iconSize} />}
              styling={clsx(
                buttonStyles.standard,
                buttonStyles.fullWidth,
                buttonStyles.destructive,
              )}
              text="Disable"
            />
            <Button
              handleOnClick={() => openFlow('regenerate')}
              icon={<RefreshCw size={iconSize} />}
              styling={clsx(buttonStyles.standard, buttonStyles.fullWidth, buttonStyles.primary)}
              text="Refresh Codes"
            />
          </div>
        ) : (
          <Button
            handleOnClick={() => openFlow('setup')}
            icon={<ShieldCheck size={iconSize} />}
            styling={clsx(buttonStyles.standard, buttonStyles.fullWidth, buttonStyles.primary)}
            text="Set Up"
          />
        )}
      </div>
      <ModalLayout
        closeDisabled={isPending || requiresSavedConfirmation}
        title={getDialogTitle(flow, step)}
      >
        {step === 'password' ? (
          <form className={formStyles.form} noValidate onSubmit={submitPassword}>
            <p className={styles.dialogDescription}>{getPasswordDescription(flow)}</p>
            <Controller
              control={passwordForm.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field.Root
                  className={formStyles.formControl}
                  invalid={fieldState.invalid || Boolean(passwordError)}
                  name={field.name}
                  touched={fieldState.isTouched}
                >
                  <Field.Label className={formStyles.label}>Password</Field.Label>
                  <Field.Control
                    autoComplete="current-password"
                    className={clsx(styles.input, validationStyles.validationErrorInput)}
                    onBlur={() => field.onBlur()}
                    onValueChange={(value) => {
                      field.onChange(value);
                      passwordForm.clearErrors('root');
                    }}
                    ref={field.ref}
                    type="password"
                    value={field.value}
                  />
                  <Field.Error className={formStyles.error} match role="alert">
                    {fieldState.error?.message ?? passwordError ?? ''}
                  </Field.Error>
                </Field.Root>
              )}
            />
            <div className={formStyles.actions}>
              <Dialog.Close
                className={clsx(
                  buttonStyles.button,
                  buttonStyles.standard,
                  buttonStyles.fullWidth,
                  buttonStyles.neutral,
                )}
                disabled={isPending}
                type="button"
              >
                <span className={buttonStyles.buttonTop}>
                  <X size={iconSize} />
                  Cancel
                </span>
              </Dialog.Close>
              <Button
                disabled={!passwordForm.formState.isValid}
                icon={
                  flow === 'disable' ? <ShieldOff size={iconSize} /> : <KeyRound size={iconSize} />
                }
                loading={isPending}
                styling={clsx(
                  buttonStyles.standard,
                  buttonStyles.fullWidth,
                  flow === 'disable' ? buttonStyles.destructive : buttonStyles.primary,
                )}
                text="Confirm"
                type="submit"
              />
            </div>
          </form>
        ) : null}
        {step === 'totp' ? (
          <form className={formStyles.form} noValidate onSubmit={submitTotp}>
            <p className={styles.dialogDescription}>
              Scan this code with your authenticator, then enter its current six-digit code.
            </p>
            <div aria-hidden="true" className={styles.qrCode}>
              <QRCode size={160} value={totpUri} />
            </div>
            <div className={styles.manualKey}>
              <span>Manual setup key</span>
              <code>{manualKey}</code>
            </div>
            <Controller
              control={totpForm.control}
              name="code"
              render={({ field, fieldState }) => (
                <Field.Root
                  className={formStyles.formControl}
                  invalid={fieldState.invalid || Boolean(totpError)}
                  name={field.name}
                  touched={fieldState.isTouched}
                >
                  <Field.Label className={formStyles.label}>Authenticator code</Field.Label>
                  <Field.Control
                    autoComplete="one-time-code"
                    className={clsx(styles.input, validationStyles.validationErrorInput)}
                    inputMode="numeric"
                    maxLength={6}
                    onBlur={() => field.onBlur()}
                    onValueChange={(value) => {
                      field.onChange(value.match(/\d/gu)?.join('') ?? '');
                      totpForm.clearErrors('root');
                    }}
                    ref={field.ref}
                    type="text"
                    value={field.value}
                  />
                  <Field.Error className={formStyles.error} match role="alert">
                    {fieldState.error?.message ?? totpError ?? ''}
                  </Field.Error>
                </Field.Root>
              )}
            />
            <Button
              disabled={!totpForm.formState.isValid}
              icon={<ShieldCheck size={iconSize} />}
              loading={verifyMutation.isPending}
              styling={clsx(buttonStyles.standard, buttonStyles.fullWidth, buttonStyles.primary)}
              text="Verify and Enable"
              type="submit"
            />
          </form>
        ) : null}
        {step === 'codes' ? (
          <div className={styles.backupCodesPanel}>
            <p className={styles.dialogDescription}>
              Store these one-time codes somewhere safe. They will not be shown again.
            </p>
            <ol className={styles.backupCodes}>
              {backupCodes.map((code) => (
                <li key={code}>
                  <code>{code}</code>
                </li>
              ))}
            </ol>
            <div className={styles.securityActions}>
              <Button
                handleOnClick={copyBackupCodes}
                icon={<Copy size={iconSize} />}
                styling={clsx(buttonStyles.standard, buttonStyles.fullWidth, buttonStyles.neutral)}
                text="Copy"
              />
              <Button
                handleOnClick={downloadBackupCodes}
                icon={<Download size={iconSize} />}
                styling={clsx(buttonStyles.standard, buttonStyles.fullWidth, buttonStyles.neutral)}
                text="Download"
              />
            </div>
            <label className={styles.savedConfirmation}>
              <input
                checked={codesSaved}
                onChange={(event) => setCodesSaved(event.target.checked)}
                type="checkbox"
              />
              I saved these backup codes
            </label>
            <Button
              disabled={!codesSaved}
              handleOnClick={() => handleOpenChange(false)}
              icon={<ShieldCheck size={iconSize} />}
              styling={clsx(buttonStyles.standard, buttonStyles.fullWidth, buttonStyles.primary)}
              text="Done"
            />
          </div>
        ) : null}
      </ModalLayout>
    </Dialog.Root>
  );
}
