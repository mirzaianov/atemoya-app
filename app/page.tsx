import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { listTasks } from '../src/db/queries';
import Home from '../src/features/home/home';
import { auth } from '../src/lib/auth';

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  const tasks = await listTasks(session.user.id);
  const initialTasks = tasks.map((task) => ({
    changedOn: task.changedOn.getTime(),
    completedAt: task.completedAt?.getTime() ?? null,
    id: task.id,
    position: task.position,
    title: task.title,
  }));

  return (
    <Home
      initialTasks={initialTasks}
      userEmail={session.user.email}
      userNickname={session.user.name}
    />
  );
}
