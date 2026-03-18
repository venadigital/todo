import type { AppStateV1, BoardFilters } from '../types';

const STORAGE_KEY = 'todo-board-state';
const VERSION = 1;

const DEFAULT_FILTERS: BoardFilters = {
  query: '',
  projectId: 'all',
  status: 'all',
  due: 'all',
};

export const createDefaultState = (): AppStateV1 => ({
  version: VERSION,
  projects: [],
  tasks: [],
  subtasks: [],
  quickTasks: [],
  filters: DEFAULT_FILTERS,
  timeSessions: [],
  activeTracking: null,
});

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isTaskStatus = (value: unknown): value is 'pending' | 'in_progress' | 'done' =>
  value === 'pending' || value === 'in_progress' || value === 'done';

const isPriority = (value: unknown): value is 'low' | 'medium' | 'high' =>
  value === 'low' || value === 'medium' || value === 'high';

const isProject = (value: unknown): boolean => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.color === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
};

const isTask = (value: unknown): boolean => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    (typeof value.projectId === 'string' || value.projectId === null) &&
    isTaskStatus(value.status) &&
    typeof value.progress === 'number' &&
    isPriority(value.priority) &&
    (typeof value.dueDate === 'string' || value.dueDate === null) &&
    typeof value.postponedCount === 'number' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
};

const isSubtask = (value: unknown): boolean => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.taskId === 'string' &&
    typeof value.title === 'string' &&
    typeof value.done === 'boolean' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
};

const isTimeSession = (value: unknown): boolean => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.taskId === 'string' &&
    typeof value.startAt === 'string' &&
    typeof value.endAt === 'string'
  );
};

const isQuickTask = (value: unknown): boolean => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.done === 'boolean' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
};

const isActiveTracking = (value: unknown): boolean => {
  if (!isObject(value)) {
    return false;
  }

  return typeof value.taskId === 'string' && typeof value.startAt === 'string';
};

const migrateToV1 = (raw: unknown): AppStateV1 | null => {
  if (!isObject(raw)) {
    return null;
  }

  const base = createDefaultState();
  const projects = Array.isArray(raw.projects)
    ? raw.projects.filter(isProject)
    : base.projects;
  const tasks = Array.isArray(raw.tasks) ? raw.tasks.filter(isTask) : base.tasks;
  const subtasks = Array.isArray(raw.subtasks)
    ? raw.subtasks.filter(isSubtask)
    : base.subtasks;
  const quickTasks = Array.isArray(raw.quickTasks)
    ? raw.quickTasks.filter(isQuickTask)
    : base.quickTasks;
  const timeSessions = Array.isArray(raw.timeSessions)
    ? raw.timeSessions.filter(isTimeSession)
    : base.timeSessions;
  const activeTracking = isActiveTracking(raw.activeTracking) ? raw.activeTracking : base.activeTracking;

  const rawFilters = isObject(raw.filters) ? raw.filters : {};
  const filters: BoardFilters = {
    query: typeof rawFilters.query === 'string' ? rawFilters.query : '',
    projectId:
      typeof rawFilters.projectId === 'string' ? rawFilters.projectId : DEFAULT_FILTERS.projectId,
    status:
      rawFilters.status === 'all' ||
      rawFilters.status === 'pending' ||
      rawFilters.status === 'in_progress' ||
      rawFilters.status === 'done'
        ? rawFilters.status
        : DEFAULT_FILTERS.status,
    due:
      rawFilters.due === 'all' ||
      rawFilters.due === 'overdue' ||
      rawFilters.due === 'today' ||
      rawFilters.due === 'this_week' ||
      rawFilters.due === 'no_date'
        ? rawFilters.due
        : DEFAULT_FILTERS.due,
  };

  return {
    version: VERSION,
    projects: projects as AppStateV1['projects'],
    tasks: tasks as AppStateV1['tasks'],
    subtasks: subtasks as AppStateV1['subtasks'],
    quickTasks: quickTasks as AppStateV1['quickTasks'],
    filters,
    timeSessions: timeSessions as AppStateV1['timeSessions'],
    activeTracking: activeTracking as AppStateV1['activeTracking'],
  };
};

export const loadState = (): AppStateV1 => {
  if (typeof window === 'undefined') {
    return createDefaultState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultState();
    }

    const parsed = JSON.parse(raw) as { version?: number };
    if (parsed.version === VERSION) {
      return normalizeState(parsed);
    }

    return normalizeState(parsed);
  } catch {
    return createDefaultState();
  }
};

export const normalizeState = (raw: unknown): AppStateV1 => {
  return migrateToV1(raw) ?? createDefaultState();
};

export const saveState = (state: AppStateV1): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Persistencia best-effort para no romper la UI.
  }
};
