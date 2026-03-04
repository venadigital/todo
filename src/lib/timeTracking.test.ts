import { describe, expect, it } from 'vitest';
import { buildTaskTimeRows, formatElapsedClock, formatMinutes, getRangeForPeriod } from './timeTracking';
import type { ActiveTracking, Task, TimeSession } from '../types';

const task = (id: string, title: string): Task => ({
  id,
  title,
  description: '',
  projectId: null,
  status: 'in_progress',
  progress: 40,
  priority: 'medium',
  dueDate: null,
  postponedCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('timeTracking helpers', () => {
  it('agrega minutos por tarea dentro del rango', () => {
    const now = new Date('2026-03-04T12:00:00.000Z');
    const range = getRangeForPeriod('daily', now);

    const tasks: Task[] = [task('t1', 'Task 1')];
    const sessions: TimeSession[] = [
      {
        id: 's1',
        taskId: 't1',
        startAt: '2026-03-04T10:00:00.000Z',
        endAt: '2026-03-04T11:30:00.000Z',
      },
    ];

    const rows = buildTaskTimeRows(tasks, new Map(), sessions, null, range, now);
    expect(rows).toHaveLength(1);
    expect(Math.round(rows[0].minutes)).toBe(90);
  });

  it('incluye tiempo de tracking activo', () => {
    const now = new Date('2026-03-04T12:00:00.000Z');
    const range = getRangeForPeriod('daily', now);
    const tasks: Task[] = [task('t1', 'Task 1')];
    const active: ActiveTracking = {
      taskId: 't1',
      startAt: '2026-03-04T11:30:00.000Z',
    };

    const rows = buildTaskTimeRows(tasks, new Map(), [], active, range, now);
    expect(rows).toHaveLength(1);
    expect(Math.round(rows[0].minutes)).toBe(30);
  });

  it('formatea minutos en texto compacto', () => {
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(120)).toBe('2h');
    expect(formatMinutes(135)).toBe('2h 15m');
  });

  it('formatea reloj digital de tiempo transcurrido', () => {
    expect(formatElapsedClock(0)).toBe('00:00:00');
    expect(formatElapsedClock(59)).toBe('00:00:59');
    expect(formatElapsedClock(65)).toBe('00:01:05');
    expect(formatElapsedClock(3723)).toBe('01:02:03');
  });
});
