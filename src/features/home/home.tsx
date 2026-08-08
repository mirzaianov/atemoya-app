import BrandHeader from '../../components/brand-header';
import type { Tag, Task } from '../../types';
import AccountMenu from './account-menu';
import TaskList from './task-list';

import styles from './home.module.css';

interface HomeProps {
  availableTags: Tag[];
  initialTasks: Task[];
  userEmail: string;
  userNickname: string;
}

export default function Home({ availableTags, initialTasks, userEmail, userNickname }: HomeProps) {
  return (
    <div className={styles.container}>
      <BrandHeader action={<AccountMenu email={userEmail} nickname={userNickname} />} />
      <TaskList tags={availableTags} tasks={initialTasks} />
    </div>
  );
}
