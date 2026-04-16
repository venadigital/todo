import { postponeDate } from '../lib/dates';
import { makeId } from '../lib/ids';
import { createDefaultState, loadState, saveState } from '../lib/storage';
import { sortSubtasksForDisplay } from '../lib/subtasks';
import type {
  AppStateV1,
  BoardFilters,
  NoteColor,
  Priority,
  ProjectDraft,
  SubtaskDraft,
  TaskDraft,
  TaskStatus,
} from '../types';
import { syncTaskWithSubtasks } from './logic';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

const nowIso = (): string => new Date().toISOString();

const sanitizeDueDate = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const defaultFilters: BoardFilters = {
  query: '',
  projectId: 'all',
  status: 'all',
  due: 'all',
};

const noteColorPalette: NoteColor[] = ['lime', 'cyan', 'amber', 'violet', 'rose'];

export interface TaskEditorPayload extends TaskDraft {
  id?: string;
  subtasks: SubtaskDraft[];
}

export interface AppActions {
  hydrateState: (payload: AppStateV1) => void;
  saveTask: (payload: TaskEditorPayload) => string;
  deleteTask: (taskId: string) => void;
  moveTask: (taskId: string, status: TaskStatus) => void;
  setTaskStatus: (taskId: string, status: TaskStatus) => void;
  setTaskProgress: (taskId: string, progress: number) => void;
  addSubtask: (taskId: string, title: string) => void;
  updateSubtask: (subtaskId: string, payload: { title?: string; done?: boolean }) => void;
  deleteSubtask: (subtaskId: string) => void;
  setSubtaskDone: (subtaskId: string, done: boolean) => void;
  reorderSubtasks: (taskId: string, orderedSubtaskIds: string[]) => void;
  startTracking: (taskId: string) => void;
  stopTracking: () => void;
  toggleTracking: (taskId: string) => void;
  postponeTask: (taskId: string, days: number) => void;
  createQuickTask: (title: string) => string | null;
  promoteQuickTaskToTask: (quickTaskId: string, projectId: string | null) => string | null;
  toggleQuickTask: (quickTaskId: string) => void;
  deleteQuickTask: (quickTaskId: string) => void;
  clearDoneQuickTasks: () => void;
  createNote: (payload?: { title?: string; content?: string; color?: NoteColor }) => string;
  updateNote: (
    noteId: string,
    payload: { title?: string; content?: string; color?: NoteColor },
  ) => void;
  deleteNote: (noteId: string) => void;
  toggleNotePinned: (noteId: string) => void;
  setTaskPriority: (taskId: string, priority: Priority) => void;
  reorderTasksWithinPriority: (priority: Priority, orderedTaskIds: string[]) => void;
  createProject: (payload: ProjectDraft) => string;
  updateProject: (projectId: string, payload: ProjectDraft) => void;
  deleteProject: (projectId: string) => void;
  setFilters: (payload: Partial<BoardFilters>) => void;
  resetFilters: () => void;
}

export interface AppStoreState extends AppStateV1 {
  actions: AppActions;
}

const normalizeSubtasks = (
  drafts: SubtaskDraft[],
  taskId: string,
  existingById: Map<string, { createdAt: string }>,
  timestamp: string,
) => {
  const baseTime = Date.now();

  return drafts
    .map((draft, index) => {
      const title = draft.title.trim();
      if (!title) {
        return null;
      }

      const id = draft.id ?? makeId('subtask');
      const existing = existingById.get(id);

      return {
        id,
        taskId,
        title,
        done: draft.done,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: new Date(baseTime - index * 1000).toISOString(),
      };
    })
    .filter((subtask): subtask is NonNullable<typeof subtask> => subtask !== null);
};

const sanitizeTaskDraft = (payload: TaskDraft): TaskDraft => ({
  title: payload.title.trim(),
  description: payload.description.trim(),
  projectId: payload.projectId && payload.projectId.length > 0 ? payload.projectId : null,
  status: payload.status,
  progress:
    payload.status === 'done'
      ? 100
      : Math.max(0, Math.min(100, Math.round(payload.progress))),
  priority: payload.priority,
  dueDate: sanitizeDueDate(payload.dueDate),
});

const progressForStatus = (currentProgress: number, status: TaskStatus): number => {
  if (status === 'done') {
    return 100;
  }

  if (status === 'pending') {
    return 0;
  }

  if (currentProgress <= 0 || currentProgress >= 100) {
    return 50;
  }

  return currentProgress;
};

const createTimeSession = (taskId: string, startAt: string, endAt: string) => ({
  id: makeId('session'),
  taskId,
  startAt,
  endAt,
});

const sortByUpdatedAtDesc = (a: { updatedAt: string }, b: { updatedAt: string }) =>
  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

const isValidNoteColor = (value: unknown): value is NoteColor =>
  typeof value === 'string' && noteColorPalette.includes(value as NoteColor);

const syncTasksForTaskId = (
  tasks: AppStateV1['tasks'],
  subtasks: AppStateV1['subtasks'],
  taskId: string,
  timestamp: string,
) => {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    return tasks;
  }

  const taskSubtasks = subtasks.filter((item) => item.taskId === taskId);
  const syncedTask = syncTaskWithSubtasks(
    {
      ...task,
      updatedAt: timestamp,
    },
    taskSubtasks,
  );

  return tasks.map((item) => (item.id === taskId ? syncedTask : item));
};

export const createAppStore = (initialState?: AppStateV1) => {
  const baseState = {
    ...createDefaultState(),
    ...(initialState ?? loadState()),
  };

  return createStore<AppStoreState>((set, get) => ({
    ...baseState,
    actions: {
      hydrateState: (payload) => {
        set((state) => ({
          ...payload,
          actions: state.actions,
        }));
      },
      saveTask: (payload) => {
        const taskId = payload.id ?? makeId('task');

        set((state) => {
          const timestamp = nowIso();
          const clean = sanitizeTaskDraft(payload);
          const existingTask = state.tasks.find((task) => task.id === taskId);

          const baseTask = existingTask
            ? {
                ...existingTask,
                ...clean,
                id: taskId,
                updatedAt: timestamp,
              }
            : {
                id: taskId,
                title: clean.title,
                description: clean.description,
                projectId: clean.projectId,
                status: clean.status,
                progress: clean.progress,
                priority: clean.priority,
                dueDate: clean.dueDate,
                postponedCount: 0,
                createdAt: timestamp,
                updatedAt: timestamp,
              };

          const previousTaskSubtasks = state.subtasks.filter((subtask) => subtask.taskId === taskId);
          const subtaskMap = new Map(
            previousTaskSubtasks.map((subtask) => [subtask.id, { createdAt: subtask.createdAt }]),
          );

          const nextTaskSubtasks = normalizeSubtasks(payload.subtasks, taskId, subtaskMap, timestamp);
          const syncedTask = syncTaskWithSubtasks(baseTask, nextTaskSubtasks);

          const tasks = existingTask
            ? state.tasks.map((task) => (task.id === taskId ? syncedTask : task))
            : [...state.tasks, syncedTask];

          const subtasks = [
            ...state.subtasks.filter((subtask) => subtask.taskId !== taskId),
            ...nextTaskSubtasks,
          ];

          return {
            ...state,
            tasks,
            subtasks,
          };
        });

        return taskId;
      },
      deleteTask: (taskId) => {
        set((state) => ({
          ...state,
          tasks: state.tasks.filter((task) => task.id !== taskId),
          subtasks: state.subtasks.filter((subtask) => subtask.taskId !== taskId),
          timeSessions: state.timeSessions.filter((session) => session.taskId !== taskId),
          activeTracking:
            state.activeTracking?.taskId === taskId ? null : state.activeTracking,
        }));
      },
      moveTask: (taskId, status) => {
        set((state) => {
          const task = state.tasks.find((item) => item.id === taskId);
          if (!task) {
            return state;
          }

          const taskSubtasks = state.subtasks.filter((subtask) => subtask.taskId === taskId);
          const candidate = {
            ...task,
            status,
            progress: progressForStatus(task.progress, status),
            updatedAt: nowIso(),
          };
          const syncedTask = syncTaskWithSubtasks(candidate, taskSubtasks);

          return {
            ...state,
            tasks: state.tasks.map((item) => (item.id === taskId ? syncedTask : item)),
          };
        });
      },
      setTaskStatus: (taskId, status) => {
        set((state) => {
          const task = state.tasks.find((item) => item.id === taskId);
          if (!task) {
            return state;
          }

          const taskSubtasks = state.subtasks.filter((subtask) => subtask.taskId === taskId);
          const candidate = {
            ...task,
            status,
            progress: progressForStatus(task.progress, status),
            updatedAt: nowIso(),
          };
          const syncedTask = syncTaskWithSubtasks(candidate, taskSubtasks);

          return {
            ...state,
            tasks: state.tasks.map((item) => (item.id === taskId ? syncedTask : item)),
          };
        });
      },
      setTaskProgress: (taskId, progress) => {
        set((state) => {
          const task = state.tasks.find((item) => item.id === taskId);
          if (!task) {
            return state;
          }

          const taskSubtasks = state.subtasks.filter((subtask) => subtask.taskId === taskId);
          const candidate = {
            ...task,
            progress,
            updatedAt: nowIso(),
          };
          const syncedTask = syncTaskWithSubtasks(candidate, taskSubtasks);

          return {
            ...state,
            tasks: state.tasks.map((item) => (item.id === taskId ? syncedTask : item)),
          };
        });
      },
      addSubtask: (taskId, title) => {
        set((state) => {
          const task = state.tasks.find((item) => item.id === taskId);
          const trimmed = title.trim();
          if (!task || !trimmed) {
            return state;
          }

          const timestamp = nowIso();
          const subtasks = [
            ...state.subtasks,
            {
              id: makeId('subtask'),
              taskId,
              title: trimmed,
              done: false,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          ];

          return {
            ...state,
            subtasks,
            tasks: syncTasksForTaskId(state.tasks, subtasks, taskId, timestamp),
          };
        });
      },
      updateSubtask: (subtaskId, payload) => {
        set((state) => {
          const subtask = state.subtasks.find((item) => item.id === subtaskId);
          if (!subtask) {
            return state;
          }

          const timestamp = nowIso();
          const nextTitle =
            typeof payload.title === 'string' ? payload.title.trim() : subtask.title;
          if (!nextTitle) {
            return state;
          }

          const subtasks = state.subtasks.map((item) =>
            item.id === subtaskId
              ? {
                  ...item,
                  title: nextTitle,
                  done: typeof payload.done === 'boolean' ? payload.done : item.done,
                  updatedAt: timestamp,
                }
              : item,
          );

          return {
            ...state,
            subtasks,
            tasks: syncTasksForTaskId(state.tasks, subtasks, subtask.taskId, timestamp),
          };
        });
      },
      deleteSubtask: (subtaskId) => {
        set((state) => {
          const subtask = state.subtasks.find((item) => item.id === subtaskId);
          if (!subtask) {
            return state;
          }

          const timestamp = nowIso();
          const subtasks = state.subtasks.filter((item) => item.id !== subtaskId);

          return {
            ...state,
            subtasks,
            tasks: syncTasksForTaskId(state.tasks, subtasks, subtask.taskId, timestamp),
          };
        });
      },
      setSubtaskDone: (subtaskId, done) => {
        get().actions.updateSubtask(subtaskId, { done });
      },
      reorderSubtasks: (taskId, orderedSubtaskIds) => {
        set((state) => {
          if (orderedSubtaskIds.length === 0) {
            return state;
          }

          const task = state.tasks.find((item) => item.id === taskId);
          if (!task) {
            return state;
          }

          const taskSubtasks = sortSubtasksForDisplay(
            state.subtasks.filter((subtask) => subtask.taskId === taskId),
          );
          if (taskSubtasks.length <= 1) {
            return state;
          }

          const existingIds = new Set(taskSubtasks.map((subtask) => subtask.id));
          const visibleIds = orderedSubtaskIds.filter((subtaskId) => existingIds.has(subtaskId));
          if (visibleIds.length === 0) {
            return state;
          }

          const missingIds = taskSubtasks
            .map((subtask) => subtask.id)
            .filter((subtaskId) => !visibleIds.includes(subtaskId));
          const finalOrder = [...visibleIds, ...missingIds];
          const currentOrder = taskSubtasks.map((subtask) => subtask.id);
          const unchanged = finalOrder.every((subtaskId, index) => subtaskId === currentOrder[index]);
          if (unchanged) {
            return state;
          }

          const now = Date.now();
          const timestampById = new Map(
            finalOrder.map((subtaskId, index) => [
              subtaskId,
              new Date(now - index * 1000).toISOString(),
            ]),
          );

          const subtasks = state.subtasks.map((subtask) => {
            if (subtask.taskId !== taskId) {
              return subtask;
            }

            const nextUpdatedAt = timestampById.get(subtask.id);
            if (!nextUpdatedAt) {
              return subtask;
            }

            return {
              ...subtask,
              updatedAt: nextUpdatedAt,
            };
          });

          return {
            ...state,
            subtasks,
            tasks: syncTasksForTaskId(state.tasks, subtasks, taskId, nowIso()),
          };
        });
      },
      startTracking: (taskId) => {
        set((state) => {
          const taskExists = state.tasks.some((task) => task.id === taskId);
          if (!taskExists) {
            return state;
          }

          const timestamp = nowIso();
          const sessions = [...state.timeSessions];

          if (state.activeTracking) {
            if (state.activeTracking.taskId === taskId) {
              return state;
            }

            sessions.push(
              createTimeSession(state.activeTracking.taskId, state.activeTracking.startAt, timestamp),
            );
          }

          return {
            ...state,
            timeSessions: sessions,
            activeTracking: {
              taskId,
              startAt: timestamp,
            },
          };
        });
      },
      stopTracking: () => {
        set((state) => {
          if (!state.activeTracking) {
            return state;
          }

          const timestamp = nowIso();

          return {
            ...state,
            timeSessions: [
              ...state.timeSessions,
              createTimeSession(state.activeTracking.taskId, state.activeTracking.startAt, timestamp),
            ],
            activeTracking: null,
          };
        });
      },
      toggleTracking: (taskId) => {
        const active = get().activeTracking;
        if (active?.taskId === taskId) {
          get().actions.stopTracking();
          return;
        }

        get().actions.startTracking(taskId);
      },
      postponeTask: (taskId, days) => {
        set((state) => {
          const task = state.tasks.find((item) => item.id === taskId);
          if (!task) {
            return state;
          }

          const taskSubtasks = state.subtasks.filter((subtask) => subtask.taskId === taskId);
          const candidate = {
            ...task,
            dueDate: postponeDate(task.dueDate, days),
            postponedCount: task.postponedCount + 1,
            updatedAt: nowIso(),
          };
          const syncedTask = syncTaskWithSubtasks(candidate, taskSubtasks);

          return {
            ...state,
            tasks: state.tasks.map((item) => (item.id === taskId ? syncedTask : item)),
          };
        });
      },
      createQuickTask: (title) => {
        const trimmed = title.trim();
        if (!trimmed) {
          return null;
        }

        const quickTaskId = makeId('quick');

        set((state) => {
          const timestamp = nowIso();

          return {
            ...state,
            quickTasks: [
              {
                id: quickTaskId,
                title: trimmed,
                done: false,
                createdAt: timestamp,
                updatedAt: timestamp,
              },
              ...state.quickTasks,
            ],
          };
        });

        return quickTaskId;
      },
      promoteQuickTaskToTask: (quickTaskId, projectId) => {
        let nextTaskId: string | null = null;

        set((state) => {
          const quickTask = state.quickTasks.find((item) => item.id === quickTaskId);
          if (!quickTask) {
            return state;
          }

          if (projectId && !state.projects.some((project) => project.id === projectId)) {
            return state;
          }

          const timestamp = nowIso();
          const normalizedTitle = quickTask.title.trim();
          if (!normalizedTitle) {
            return state;
          }

          const createdTaskId = makeId('task');
          nextTaskId = createdTaskId;

          return {
            ...state,
            quickTasks: state.quickTasks.filter((item) => item.id !== quickTaskId),
            tasks: [
              {
                id: createdTaskId,
                title: normalizedTitle,
                description: '',
                projectId,
                status: quickTask.done ? 'done' : 'pending',
                progress: quickTask.done ? 100 : 0,
                priority: 'high',
                dueDate: null,
                postponedCount: 0,
                createdAt: timestamp,
                updatedAt: timestamp,
              },
              ...state.tasks,
            ],
          };
        });

        return nextTaskId;
      },
      toggleQuickTask: (quickTaskId) => {
        set((state) => ({
          ...state,
          quickTasks: state.quickTasks.map((quickTask) =>
            quickTask.id === quickTaskId
              ? {
                  ...quickTask,
                  done: !quickTask.done,
                  updatedAt: nowIso(),
                }
              : quickTask,
          ),
        }));
      },
      deleteQuickTask: (quickTaskId) => {
        set((state) => ({
          ...state,
          quickTasks: state.quickTasks.filter((quickTask) => quickTask.id !== quickTaskId),
        }));
      },
      clearDoneQuickTasks: () => {
        set((state) => ({
          ...state,
          quickTasks: state.quickTasks.filter((quickTask) => !quickTask.done),
        }));
      },
      createNote: (payload) => {
        const noteId = makeId('note');

        set((state) => {
          const timestamp = nowIso();

          return {
            ...state,
            notes: [
              {
                id: noteId,
                title: payload?.title?.trim() || 'Nueva nota',
                content: payload?.content?.trim() || '',
                color: isValidNoteColor(payload?.color) ? payload.color : 'lime',
                pinned: false,
                createdAt: timestamp,
                updatedAt: timestamp,
              },
              ...state.notes,
            ],
          };
        });

        return noteId;
      },
      updateNote: (noteId, payload) => {
        set((state) => ({
          ...state,
          notes: state.notes.map((note) => {
            if (note.id !== noteId) {
              return note;
            }

            return {
              ...note,
              title:
                typeof payload.title === 'string'
                  ? payload.title.slice(0, 120)
                  : note.title,
              content:
                typeof payload.content === 'string'
                  ? payload.content.slice(0, 1200)
                  : note.content,
              color: isValidNoteColor(payload.color) ? payload.color : note.color,
              updatedAt: nowIso(),
            };
          }),
        }));
      },
      deleteNote: (noteId) => {
        set((state) => ({
          ...state,
          notes: state.notes.filter((note) => note.id !== noteId),
        }));
      },
      toggleNotePinned: (noteId) => {
        set((state) => ({
          ...state,
          notes: state.notes.map((note) =>
            note.id === noteId
              ? {
                  ...note,
                  pinned: !note.pinned,
                  updatedAt: nowIso(),
                }
              : note,
          ),
        }));
      },
      setTaskPriority: (taskId, priority) => {
        set((state) => ({
          ...state,
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  priority,
                  updatedAt: nowIso(),
                }
              : task,
          ),
        }));
      },
      reorderTasksWithinPriority: (priority, orderedTaskIds) => {
        set((state) => {
          if (orderedTaskIds.length === 0) {
            return state;
          }

          const allPriorityTasks = state.tasks
            .filter((task) => task.priority === priority)
            .sort(sortByUpdatedAtDesc);

          if (allPriorityTasks.length <= 1) {
            return state;
          }

          const existingIds = new Set(allPriorityTasks.map((task) => task.id));
          const orderedVisibleIds = orderedTaskIds.filter((taskId) => existingIds.has(taskId));
          if (orderedVisibleIds.length === 0) {
            return state;
          }

          const missingIds = allPriorityTasks
            .map((task) => task.id)
            .filter((taskId) => !orderedVisibleIds.includes(taskId));
          const finalOrder = [...orderedVisibleIds, ...missingIds];

          const baseTime = Date.now();
          const timestampById = new Map(
            finalOrder.map((taskId, index) => [taskId, new Date(baseTime - index * 1000).toISOString()]),
          );

          return {
            ...state,
            tasks: state.tasks.map((task) => {
              if (task.priority !== priority) {
                return task;
              }

              const nextUpdatedAt = timestampById.get(task.id);
              if (!nextUpdatedAt) {
                return task;
              }

              return {
                ...task,
                updatedAt: nextUpdatedAt,
              };
            }),
          };
        });
      },
      createProject: (payload) => {
        const projectId = makeId('project');

        set((state) => {
          const timestamp = nowIso();
          const project = {
            id: projectId,
            name: payload.name.trim(),
            color: payload.color,
            createdAt: timestamp,
            updatedAt: timestamp,
          };

          return {
            ...state,
            projects: [...state.projects, project],
          };
        });

        return projectId;
      },
      updateProject: (projectId, payload) => {
        set((state) => ({
          ...state,
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  name: payload.name.trim(),
                  color: payload.color,
                  updatedAt: nowIso(),
                }
              : project,
          ),
        }));
      },
      deleteProject: (projectId) => {
        set((state) => {
          const tasksToDelete = new Set(
            state.tasks.filter((task) => task.projectId === projectId).map((task) => task.id),
          );

          return {
            ...state,
            projects: state.projects.filter((project) => project.id !== projectId),
            tasks: state.tasks.filter((task) => task.projectId !== projectId),
            subtasks: state.subtasks.filter((subtask) => !tasksToDelete.has(subtask.taskId)),
            timeSessions: state.timeSessions.filter((session) => !tasksToDelete.has(session.taskId)),
            activeTracking:
              state.activeTracking && tasksToDelete.has(state.activeTracking.taskId)
                ? null
                : state.activeTracking,
            filters:
              state.filters.projectId === projectId
                ? { ...state.filters, projectId: 'all' }
                : state.filters,
          };
        });
      },
      setFilters: (payload) => {
        set((state) => ({
          ...state,
          filters: {
            ...state.filters,
            ...payload,
          },
        }));
      },
      resetFilters: () => {
        set((state) => ({
          ...state,
          filters: defaultFilters,
        }));
      },
    },
  }));
};

const store = createAppStore(loadState());

store.subscribe((state) => {
  saveState({
    version: 1,
    projects: state.projects,
    tasks: state.tasks,
    subtasks: state.subtasks,
    notes: state.notes,
    quickTasks: state.quickTasks,
    filters: state.filters,
    timeSessions: state.timeSessions,
    activeTracking: state.activeTracking,
  });
});

export const useAppStore = <T>(selector: (state: AppStoreState) => T): T =>
  useStore(store, selector);

export const appStoreApi = store;

export const resetStore = (): void => {
  const next = createDefaultState();
  appStoreApi.setState({
    ...next,
    actions: appStoreApi.getState().actions,
  });
};
