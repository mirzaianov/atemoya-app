import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { listTags } from '../../src/db/tag-queries';
import Settings from '../../src/features/settings/settings';
import { auth } from '../../src/lib/auth';

interface SettingsPageProps {
  searchParams: Promise<{ returnTag?: string | string[] }>;
}

export default async function Page({ searchParams }: SettingsPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  const tags = await listTags(session.user.id);
  const { returnTag } = await searchParams;
  const returnTagIds = typeof returnTag === 'string' ? [returnTag] : (returnTag ?? []);
  const homeSearchParams = new URLSearchParams();

  for (const tagId of returnTagIds.slice(0, 10)) {
    if (tagId) {
      homeSearchParams.append('tag', tagId);
    }
  }

  const homeQuery = homeSearchParams.toString();
  const homeHref = homeQuery ? `/?${homeQuery}` : '/';

  return (
    <Settings
      homeHref={homeHref}
      tags={tags}
      twoFactorEnabled={Boolean(session.user.twoFactorEnabled)}
      userEmail={session.user.email}
      userNickname={session.user.name}
    />
  );
}
