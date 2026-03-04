import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { ActiveTracking, Task, TimeSession } from '../types';

export type DashboardPeriod = 'daily' | 'weekly' | 'monthly';

export interface DashboardRange {
  start: Date;
  end: Date;
}

export interface TimeByTaskRow {
  taskId: string;
  taskTitle: string;
  projectName: string;
  minutes: number;
}

export const getRangeForPeriod = (period: DashboardPeriod, now: Date): DashboardRange => {
  if (period === 'daily') {
    return {
      start: startOfDay(now),
      end: endOfDay(now),
    };
  }

  if (period === 'weekly') {
    return {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    };
  }

  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
};

const overlapMinutes = (startA: Date, endA: Date, startB: Date, endB: Date): number => {
  const start = Math.max(startA.getTime(), startB.getTime());
  const end = Math.min(endA.getTime(), endB.getTime());

  if (end <= start) {
    return 0;
  }

  return (end - start) / 1000 / 60;
};

export const buildTaskTimeRows = (
  tasks: Task[],
  projectNamesById: Map<string, string>,
  sessions: TimeSession[],
  activeTracking: ActiveTracking | null,
  range: DashboardRange,
  now: Date,
): TimeByTaskRow[] => {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const minutesByTask = new Map<string, number>();

  for (const session of sessions) {
    const task = taskById.get(session.taskId);
    if (!task) {
      continue;
    }

    const minutes = overlapMinutes(
      new Date(session.startAt),
      new Date(session.endAt),
      range.start,
      range.end,
    );

    if (minutes <= 0) {
      continue;
    }

    minutesByTask.set(task.id, (minutesByTask.get(task.id) ?? 0) + minutes);
  }

  if (activeTracking) {
    const task = taskById.get(activeTracking.taskId);
    if (task) {
      const minutes = overlapMinutes(new Date(activeTracking.startAt), now, range.start, range.end);
      if (minutes > 0) {
        minutesByTask.set(task.id, (minutesByTask.get(task.id) ?? 0) + minutes);
      }
    }
  }

  return Array.from(minutesByTask.entries())
    .map(([taskId, minutes]) => {
      const task = taskById.get(taskId);
      if (!task) {
        return null;
      }

      return {
        taskId,
        taskTitle: task.title,
        projectName: task.projectId ? projectNamesById.get(task.projectId) ?? 'Sin proyecto' : 'Sin proyecto',
        minutes,
      };
    })
    .filter((row): row is TimeByTaskRow => row !== null)
    .sort((left, right) => right.minutes - left.minutes);
};

export const formatMinutes = (minutes: number): string => {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
};
