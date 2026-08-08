'use client';

import { AlertDialog } from '@base-ui/react/alert-dialog';
import { Field } from '@base-ui/react/field';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import DeleteModalLayout from '../../components/delete-modal-layout';
import ModalLayout from '../../components/modal-layout';
import { authClient } from '../../lib/auth-client';

import buttonStyles from '../../components/button.module.css';
import formStyles from '../../components/modal-form-layout.module.css';
import inputStyles from '../home/task-form.module.css';

const buttonSmall = 20;

interface DeleteAccountDialogProps {
  userEmail: string;
}

interface DeleteAccountFormValues {
  confirmEmail: string;
}

const getDeleteAccountError = (code?: string) => {
  if (code === 'SESSION_EXPIRED') {
    return 'Please sign in again before deleting your account.';
  }

  return 'Account could not be deleted. Please try again.';
};

export default function DeleteAccountDialog({ userEmail }: DeleteAccountDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const [isNavigationPending, startNavigation] = useTransition();
  const {
    clearErrors,
    control,
    formState: { errors },
    handleSubmit,
    reset,
    setError,
    setFocus,
  } = useForm<DeleteAccountFormValues>({
    defaultValues: {
      confirmEmail: '',
    },
  });
  const confirmedEmail = useWatch({ control, name: 'confirmEmail' });
  const isConfirmed = confirmedEmail.trim().toLowerCase() === userEmail.toLowerCase();
  const errorMessage = errors.confirmEmail?.message ?? errors.root?.message;
  const deleteAccountMutation = useMutation({
    mutationFn: () =>
      authClient.deleteUser({
        callbackURL: '/login',
      }),
  });
  const isPending = deleteAccountMutation.isPending || isNavigationPending;

  useEffect(() => {
    if (!isOpen) {
      reset({ confirmEmail: '' });

      return;
    }

    setFocus('confirmEmail');
  }, [isOpen, reset, setFocus]);

  const onSubmit = handleSubmit(async ({ confirmEmail }) => {
    if (confirmEmail.trim().toLowerCase() !== userEmail.toLowerCase()) {
      setError('confirmEmail', { message: 'Email does not match.' });

      return;
    }

    const { error } = await deleteAccountMutation.mutateAsync();

    if (error) {
      setError('root', { message: getDeleteAccountError(error.code) });

      return;
    }

    startNavigation(() => {
      router.push('/login');
      router.refresh();
    });
  });

  return (
    <AlertDialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!(isPending && !open)) {
          setIsOpen(open);
        }
      }}
    >
      <AlertDialog.Trigger
        className={clsx(
          buttonStyles.button,
          buttonStyles.standard,
          buttonStyles.fullWidth,
          buttonStyles.destructive,
        )}
        type="button"
      >
        <span className={buttonStyles.buttonTop}>
          <Trash2 size={buttonSmall} />
          Delete Account
        </span>
      </AlertDialog.Trigger>
      <ModalLayout alert closeDisabled={isPending} title="Delete Account">
        <DeleteModalLayout
          confirmDisabled={!isConfirmed}
          confirmPending={isPending}
          onSubmit={onSubmit}
        >
          <Controller
            control={control}
            name="confirmEmail"
            render={({
              field: { name, onBlur, onChange, ref, value },
              fieldState: { isDirty, isTouched },
            }) => (
              <Field.Root
                className={formStyles.formControl}
                dirty={isDirty}
                invalid={Boolean(errorMessage)}
                name={name}
                touched={isTouched}
              >
                <Field.Label className={formStyles.label}>
                  Enter your email to delete the account
                </Field.Label>
                <Field.Control
                  autoComplete="email"
                  className={inputStyles.input}
                  enterKeyHint="done"
                  id="delete-account-email"
                  onBlur={onBlur}
                  onValueChange={(nextValue) => {
                    onChange(nextValue);
                    clearErrors();
                  }}
                  ref={ref}
                  type="email"
                  value={value}
                />
                <Field.Error
                  className={formStyles.error}
                  match={Boolean(errorMessage)}
                  role="alert"
                >
                  {errorMessage}
                </Field.Error>
              </Field.Root>
            )}
          />
        </DeleteModalLayout>
      </ModalLayout>
    </AlertDialog.Root>
  );
}
