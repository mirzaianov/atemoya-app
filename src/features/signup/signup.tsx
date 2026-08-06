'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import BrandHeader from '../../components/brand-header';
import { authClient } from '../../lib/auth-client';
import { getSignUpErrorMessage, getSignUpPasswordErrorMessage } from '../auth/auth-error-messages';
import { signUpSchema } from '../auth/auth-schemas';
import type { SignUpFormValues } from '../auth/auth-schemas';
import { pendingVerificationEmailKey, verificationCallbackURL } from '../auth/email-verification';
import { isNicknameAvailableAction } from './signup-actions';
import SignupForm from './signup-form';

import styles from '../auth/auth-page.module.css';

export default function Signup() {
  const form = useForm<SignUpFormValues>({
    defaultValues: {
      confirmEmail: '',
      confirmPassword: '',
      email: '',
      nickname: '',
      password: '',
    },
    mode: 'onChange',
    resolver: zodResolver(signUpSchema),
  });
  const { setFocus } = form;
  const router = useRouter();
  const signUpMutation = useMutation({
    mutationFn: async ({ email, nickname, password }: SignUpFormValues) => {
      const nicknameResult = await isNicknameAvailableAction(nickname);

      if (nicknameResult.error) {
        form.setError('nickname', { message: nicknameResult.error });

        return;
      }

      if (!nicknameResult.available) {
        form.setError('nickname', {
          message: 'This nickname is already taken',
        });

        return;
      }

      const { error } = await authClient.signUp.email({
        callbackURL: verificationCallbackURL,
        email,
        name: nickname,
        password,
      });

      if (error) {
        const passwordError = getSignUpPasswordErrorMessage(error);

        if (passwordError) {
          form.setError('password', { message: passwordError });

          return;
        }

        const retryNicknameResult = await isNicknameAvailableAction(nickname);

        if (!retryNicknameResult.available) {
          form.setError('nickname', {
            message: 'This nickname is already taken',
          });

          return;
        }

        form.setError('root', { message: getSignUpErrorMessage(error) });

        return;
      }

      try {
        sessionStorage.setItem(pendingVerificationEmailKey, email);
      } catch {
        // The check-email page supports manual entry when browser storage is unavailable.
      }

      router.replace('/check-email');
    },
    onError: () => {
      form.setError('root', { message: 'Sign up failed. Please try again.' });
    },
  });

  useEffect(() => {
    setFocus('nickname');
  }, [setFocus]);

  const submit = form.handleSubmit((values) => signUpMutation.mutateAsync(values));

  return (
    <div className={styles.container}>
      <BrandHeader />
      <div className={styles.formContainer}>
        <SignupForm
          control={form.control}
          rootError={form.formState.errors.root?.message}
          isSubmitting={signUpMutation.isPending}
          isValid={form.formState.isValid}
          onSubmit={submit}
          clearError={() => form.clearErrors('root')}
          toLogin={() => router.push('/login')}
        />
      </div>
    </div>
  );
}
