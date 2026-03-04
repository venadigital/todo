import { describe, expect, it } from 'vitest';
import { addDays, format } from 'date-fns';
import type { BoardFilters, Task } from '../types';
import { filterTasks } from './selectors';

const baseFilters: BoardFilters = {
  query: '',
  projectId: 'all',
  status: 'all',
  due: 'all',
};

const baseTask = (id: string, partial: Partial<Task>): Task => ({
  id,
  title: 'Default',
  description: '',
  projectId: null,
  status: 'pending',
  progress: 0,
  priority: 'medium',
  dueDate: null,
  postponedCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...partial,
});

describe('filterTasks', () => {
  it('filtra por texto, proyecto y estado', () => {
    const tasks: Task[] = [
      baseTask('1', { title: 'Implementar store', description: 'zustand', projectId: 'p1', status: 'in_progress' }),
      baseTask('2', { title: 'Diseño UI', projectId: 'p2', status: 'pending' }),
      baseTask('3', { title: 'Tests', projectId: 'p1', status: 'done' }),
    ];

    const result = filterTasks(tasks, {
      ...baseFilters,
      query: 'store',
      projectId: 'p1',
      status: 'in_progress',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filtra tareas sin fecha', () => {
    const tasks: Task[] = [
      baseTask('1', { dueDate: null }),
      baseTask('2', { dueDate: '2030-01-10' }),
    ];

    const result = filterTasks(tasks, {
      ...baseFilters,
      due: 'no_date',
    });

    expect(result.map((task) => task.id)).toEqual(['1']);
  });

  it('filtra tareas con vencimiento hoy', () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    const tasks: Task[] = [
      baseTask('1', { dueDate: today }),
      baseTask('2', { dueDate: tomorrow }),
      baseTask('3', { dueDate: null }),
    ];

    const result = filterTasks(tasks, {
      ...baseFilters,
      due: 'today',
    });

    expect(result.map((task) => task.id)).toEqual(['1']);
  });
});
