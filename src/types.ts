export interface Tag {
  color: string;
  id: string;
  name: string;
}

export interface Task {
  changedOn: number;
  completedAt: number | null;
  id: string;
  position: number;
  title: string;
}
