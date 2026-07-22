import { getPasswordResetPageState } from '../../src/features/auth/password-reset';
import ResetPassword from '../../src/features/reset-password/reset-password';

interface PageProps {
  searchParams: Promise<{
    error?: string | string[];
    token?: string | string[];
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const query = await searchParams;

  return <ResetPassword state={getPasswordResetPageState(query.token, query.error)} />;
}
