import type { Subtask } from '../types';

export const compareSubtasksForDisplay = (a: Subtask, b: Subtask): number => {
  if (a.done !== b.done) {
    return a.done ? 1 : -1;
  }

  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
};

export const sortSubtasksForDisplay = (subtasks: Subtask[]): Subtask[] => {
  return [...subtasks].sort(compareSubtasksForDisplay);
};
