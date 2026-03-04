export type TaskStatus = 'pending' | 'in_progress' | 'done';

export type Priority = 'low' | 'medium' | 'high';

export type DueFilter = 'all' | 'overdue' | 'today' | 'this_week' | 'no_date';

export interface Project {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string | null;
  status: TaskStatus;
  progress: number;
  priority: Priority;
  dueDate: string | null;
  postponedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoardFilters {
  query: string;
  projectId: string | 'all';
  status: TaskStatus | 'all';
  due: DueFilter;
}

export interface TimeSession {
  id: string;
  taskId: string;
  startAt: string;
  endAt: string;
}

export interface ActiveTracking {
  taskId: string;
  startAt: string;
}

export interface AppStateV1 {
  version: 1;
  projects: Project[];
  tasks: Task[];
  subtasks: Subtask[];
  filters: BoardFilters;
  timeSessions: TimeSession[];
  activeTracking: ActiveTracking | null;
}

export interface TaskDraft {
  title: string;
  description: string;
  projectId: string | null;
  status: TaskStatus;
  progress: number;
  priority: Priority;
  dueDate: string | null;
}

export interface SubtaskDraft {
  id?: string;
  title: string;
  done: boolean;
}

export interface ProjectDraft {
  name: string;
  color: string;
}
