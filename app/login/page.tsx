import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getVerificationNotice } from '../../src/features/auth/email-verification';
import { getPasswordResetNotice } from '../../src/features/auth/password-reset';
import Login from '../../src/features/login/login';
import { auth } from '../../src/lib/auth';

interface PageProps {
  searchParams: Promise<{
    error?: string | string[];
    reset?: string | string[];
    verified?: string | string[];
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect('/');
  }

  const query = await searchParams;

  return (
    <Login
      notice={
        getVerificationNotice(query.verified, query.error) ?? getPasswordResetNotice(query.reset)
      }
    />
  );
}
