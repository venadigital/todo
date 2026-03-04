import { isDueOverdue, isDueThisWeek, isDueToday } from '../lib/dates';
import type { BoardFilters, Task } from '../types';

const includesQuery = (task: Task, query: string): boolean => {
  if (!query.trim()) {
    return true;
  }

  const normalized = query.trim().toLowerCase();
  return (
    task.title.toLowerCase().includes(normalized) ||
    task.description.toLowerCase().includes(normalized)
  );
};

const matchesDue = (task: Task, due: BoardFilters['due']): boolean => {
  if (due === 'all') {
    return true;
  }

  if (due === 'no_date') {
    return task.dueDate === null;
  }

  if (!task.dueDate) {
    return false;
  }

  if (due === 'today') {
    return isDueToday(task.dueDate);
  }

  if (due === 'this_week') {
    return isDueThisWeek(task.dueDate);
  }

  return isDueOverdue(task.dueDate);
};

export const filterTasks = (tasks: Task[], filters: BoardFilters): Task[] => {
  return tasks.filter((task) => {
    if (!includesQuery(task, filters.query)) {
      return false;
    }

    if (filters.projectId !== 'all' && task.projectId !== filters.projectId) {
      return false;
    }

    if (filters.status !== 'all' && task.status !== filters.status) {
      return false;
    }

    return matchesDue(task, filters.due);
  });
};
