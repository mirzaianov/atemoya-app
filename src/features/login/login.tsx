'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import BrandHeader from '../../components/brand-header';
import { authClient } from '../../lib/auth-client';
import { getSignInErrorMessage } from '../auth/auth-error-messages';
import { signInSchema } from '../auth/auth-schemas';
import type { SignInFormValues } from '../auth/auth-schemas';
import type { VerificationNotice } from '../auth/email-verification';
import LoginForm from './login-form';

import styles from '../auth/auth-page.module.css';

interface LoginProps {
  notice?: VerificationNotice;
}

export default function Login({ notice }: LoginProps) {
  const form = useForm<SignInFormValues>({
    defaultValues: { email: '', password: '' },
    mode: 'onChange',
    resolver: zodResolver(signInSchema),
  });
  const { setFocus } = form;
  const router = useRouter();
  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: SignInFormValues) => {
      const { data, error } = await authClient.signIn.email({
        email,
        password,
      });

      if (error) {
        form.setError('root', { message: getSignInErrorMessage(error) });

        return;
      }

      if ('twoFactorRedirect' in data && data.twoFactorRedirect) {
        return;
      }

      router.push('/');
    },
    onError: () => {
      form.setError('root', { message: 'Sign in failed. Please try again.' });
    },
  });

  useEffect(() => {
    setFocus('email');
  }, [setFocus]);

  const submit = form.handleSubmit((values) => signInMutation.mutateAsync(values));

  return (
    <div className={styles.container}>
      <BrandHeader />
      <div className={styles.formContainer}>
        <LoginForm
          control={form.control}
          notice={notice}
          rootError={form.formState.errors.root?.message}
          isSubmitting={signInMutation.isPending}
          isValid={form.formState.isValid}
          onSubmit={submit}
          clearError={() => form.clearErrors('root')}
          toForgotPassword={() => router.push('/forgot-password')}
          toSignup={() => router.push('/signup')}
        />
      </div>
    </div>
  );
}
