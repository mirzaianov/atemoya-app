import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { listTags } from '../../src/db/tag-queries';
import Settings from '../../src/features/settings/settings';
import { auth } from '../../src/lib/auth';

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  const tags = await listTags(session.user.id);

  return (
    <Settings
      tags={tags}
      twoFactorEnabled={Boolean(session.user.twoFactorEnabled)}
      userEmail={session.user.email}
      userNickname={session.user.name}
    />
  );
}
