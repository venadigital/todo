import type { Subtask, Task } from '../types';

export const clampProgress = (value: number): number => {
  const rounded = Math.round(value);
  if (rounded < 0) {
    return 0;
  }
  if (rounded > 100) {
    return 100;
  }
  return rounded;
};

export const syncTaskWithoutSubtasks = (task: Task): Task => {
  const progress = clampProgress(task.progress);

  if (progress === 100) {
    return { ...task, status: 'done', progress: 100 };
  }

  if (progress === 0) {
    return { ...task, status: 'pending', progress: 0 };
  }

  if (task.status === 'done') {
    return { ...task, status: 'done', progress: 100 };
  }

  return { ...task, status: 'in_progress', progress };
};

export const syncTaskWithSubtasks = (task: Task, subtasks: Subtask[]): Task => {
  if (subtasks.length === 0) {
    return syncTaskWithoutSubtasks(task);
  }

  const completed = subtasks.filter((subtask) => subtask.done).length;

  if (completed === subtasks.length) {
    return { ...task, status: 'done', progress: 100 };
  }

  if (completed === 0) {
    return { ...task, status: 'pending', progress: 0 };
  }

  const progress = clampProgress((completed / subtasks.length) * 100);
  return { ...task, status: 'in_progress', progress };
};
