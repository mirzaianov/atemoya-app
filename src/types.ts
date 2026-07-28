export interface Task {
  changedOn: number;
  completedAt: number | null;
  id: string;
  position: number;
  title: string;
}
