'use client';

import { Dialog } from '@base-ui/react/dialog';
import { Field } from '@base-ui/react/field';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { FilePen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import EditModalLayout from '../../components/edit-modal-layout';
import ModalLayout from '../../components/modal-layout';
import { nicknameSchema } from '../../lib/auth-nickname';
import { updateNicknameAction } from './settings-actions';

import buttonStyles from '../../components/button.module.css';
import formStyles from '../../components/modal-form-layout.module.css';
import validationStyles from '../../styles/form.module.css';
import styles from './settings.module.css';

const iconSize = 20;
const nicknameFormSchema = z.object({ nickname: nicknameSchema });

type NicknameFormValues = z.infer<typeof nicknameFormSchema>;

interface NicknameEditDialogProps {
  currentNickname: string;
  onUpdated: (nickname: string) => void;
}

export default function NicknameEditDialog({
  currentNickname,
  onUpdated,
}: NicknameEditDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const {
    control,
    formState: { isValid },
    handleSubmit,
    reset,
    setError,
    setFocus,
  } = useForm<NicknameFormValues>({
    defaultValues: { nickname: currentNickname },
    mode: 'onChange',
    resolver: zodResolver(nicknameFormSchema),
  });
  const updateNicknameMutation = useMutation({
    mutationFn: updateNicknameAction,
  });

  useEffect(() => {
    if (!isOpen) {
      reset({ nickname: currentNickname });

      return;
    }

    setFocus('nickname');
  }, [currentNickname, isOpen, reset, setFocus]);

  const updateNickname = handleSubmit(async ({ nickname }) => {
    if (nickname === currentNickname) {
      setError('nickname', { message: 'Enter a different nickname.' });

      return;
    }

    const result = await updateNicknameMutation.mutateAsync(nickname);

    if (result.error) {
      setError('nickname', { message: result.error });

      return;
    }

    onUpdated(nickname);
    setIsOpen(false);
    router.refresh();
  });

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger
        className={clsx(
          buttonStyles.button,
          buttonStyles.standard,
          buttonStyles.primary,
          styles.editButton,
        )}
        type="button"
      >
        <span className={buttonStyles.buttonTop}>
          <FilePen size={iconSize} />
          Edit
        </span>
      </Dialog.Trigger>
      <ModalLayout title="Edit Nickname">
        <EditModalLayout
          confirmDisabled={!isValid}
          confirmPending={updateNicknameMutation.isPending}
          onSubmit={updateNickname}
        >
          <Controller
            control={control}
            name="nickname"
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
                <Field.Label className={formStyles.label}>Nickname</Field.Label>
                <Field.Control
                  autoComplete="off"
                  className={clsx(styles.input, validationStyles.validationInput)}
                  id="edit-nickname"
                  onBlur={onBlur}
                  onValueChange={onChange}
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
        </EditModalLayout>
      </ModalLayout>
    </Dialog.Root>
  );
}
