import { useEffect, useMemo, useRef, useState } from 'react';
import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Column } from './components/Column';
import { ConfirmModal } from './components/ConfirmModal';
import { GlobalPendingBoard } from './components/GlobalPendingBoard';
import { HeaderBar } from './components/HeaderBar';
import { ProjectModal } from './components/ProjectModal';
import { Sidebar } from './components/Sidebar';
import { TaskDetailModal } from './components/TaskDetailModal';
import { TaskModal } from './components/TaskModal';
import { TimeDashboard } from './components/TimeDashboard';
import { formatElapsedClock } from './lib/timeTracking';
import { isRemoteSyncEnabled, loadRemoteState, saveRemoteState } from './lib/remoteState';
import { appStoreApi, useAppStore } from './store/createAppStore';
import { filterTasks } from './store/selectors';
import { CalendarDays, FolderKanban, Globe2, LayoutDashboard } from 'lucide-react';
import type { DragEndEvent } from '@dnd-kit/core';
import type { AppStateV1, BoardFilters, TaskStatus } from './types';

const statusColumns: Array<{ status: TaskStatus; title: string }> = [
  { status: 'pending', title: 'Pendiente' },
  { status: 'in_progress', title: 'En progreso' },
  { status: 'done', title: 'Hecho' },
];

const priorityWeight = {
  high: 0,
  medium: 1,
  low: 2,
};

const sortTasks = (a: { priority: keyof typeof priorityWeight; updatedAt: string }, b: typeof a) => {
  if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
    return priorityWeight[a.priority] - priorityWeight[b.priority];
  }

  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
};

type TaskModalState = { mode: 'create' } | { mode: 'edit'; taskId: string } | null;
type ProjectModalState = { mode: 'create' } | { mode: 'edit'; projectId: string } | null;
type BoardViewMode = 'project' | 'global' | 'dashboard';

interface ConfirmState {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}

const hasAnyUserData = (state: AppStateV1): boolean => {
  return (
    state.projects.length > 0 ||
    state.tasks.length > 0 ||
    state.subtasks.length > 0 ||
    state.timeSessions.length > 0
  );
};

function App() {
  const tasks = useAppStore((state) => state.tasks);
  const projects = useAppStore((state) => state.projects);
  const subtasks = useAppStore((state) => state.subtasks);
  const filters = useAppStore((state) => state.filters);
  const timeSessions = useAppStore((state) => state.timeSessions);
  const activeTracking = useAppStore((state) => state.activeTracking);
  const actions = useAppStore((state) => state.actions);

  const [taskModalState, setTaskModalState] = useState<TaskModalState>(null);
  const [taskDetailId, setTaskDetailId] = useState<string | null>(null);
  const [projectModalState, setProjectModalState] = useState<ProjectModalState>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [viewMode, setViewMode] = useState<BoardViewMode>('project');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const remoteReadyRef = useRef(false);
  const remoteAvailableRef = useRef(false);
  const lastRemoteSnapshotRef = useRef('');

  useEffect(() => {
    if (!activeTracking) {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [activeTracking]);

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', onResize);
    onResize();

    return () => window.removeEventListener('resize', onResize);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const projectById = useMemo(() => {
    return new Map(projects.map((project) => [project.id, project]));
  }, [projects]);

  const subtasksByTaskId = useMemo(() => {
    const map = new Map<string, typeof subtasks>();

    for (const subtask of subtasks) {
      const current = map.get(subtask.taskId) ?? [];
      map.set(subtask.taskId, [...current, subtask]);
    }

    return map;
  }, [subtasks]);

  const effectiveFilters = useMemo(() => {
    if (filters.due !== 'today') {
      return filters;
    }

    return {
      ...filters,
      projectId: 'all' as const,
      status: 'all' as const,
    };
  }, [filters]);

  const filteredTasks = useMemo(
    () => filterTasks(tasks, effectiveFilters).sort(sortTasks),
    [tasks, effectiveFilters],
  );

  const tasksByStatus = useMemo(() => {
    return {
      pending: filteredTasks.filter((task) => task.status === 'pending'),
      in_progress: filteredTasks.filter((task) => task.status === 'in_progress'),
      done: filteredTasks.filter((task) => task.status === 'done'),
    };
  }, [filteredTasks]);

  const globalTasks = useMemo(() => {
    return filterTasks(tasks, {
      query: filters.query,
      projectId: 'all',
      status: filters.due === 'today' ? 'all' : filters.status,
      due: filters.due,
    }).sort(sortTasks);
  }, [tasks, filters.query, filters.status, filters.due]);

  const dueTodayCount = useMemo(() => {
    return filterTasks(tasks, {
      query: '',
      projectId: 'all',
      status: 'all',
      due: 'today',
    }).length;
  }, [tasks]);

  const activeTask =
    taskModalState?.mode === 'edit' ? tasks.find((task) => task.id === taskModalState.taskId) : undefined;

  const activeTaskSubtasks = activeTask ? subtasks.filter((subtask) => subtask.taskId === activeTask.id) : [];

  const activeProject =
    projectModalState?.mode === 'edit'
      ? projects.find((project) => project.id === projectModalState.projectId)
      : undefined;
  const activeDetailTask = taskDetailId ? tasks.find((task) => task.id === taskDetailId) : undefined;
  const activeDetailSubtasks = activeDetailTask
    ? subtasks.filter((subtask) => subtask.taskId === activeDetailTask.id)
    : [];

  const openDeleteTaskConfirm = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) {
      return;
    }

    setConfirmState({
      title: 'Borrar tarea',
      description: `Esta acción eliminará la tarea "${task.title}" y sus subtareas.`,
      confirmLabel: 'Eliminar tarea',
      onConfirm: () => {
        actions.deleteTask(taskId);
      },
    });
  };

  const openDeleteProjectConfirm = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) {
      return;
    }

    setConfirmState({
      title: 'Borrar proyecto',
      description: `Se borrará el proyecto "${project.name}" junto con sus tareas y subtareas asociadas.`,
      confirmLabel: 'Eliminar proyecto',
      onConfirm: () => {
        actions.deleteProject(projectId);
      },
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) {
      return;
    }

    const taskId = String(active.id);
    const sourceTask = tasks.find((task) => task.id === taskId);

    if (!sourceTask) {
      return;
    }

    const overId = String(over.id);

    let targetStatus: TaskStatus | null = null;

    if (overId.startsWith('column-')) {
      const status = overId.replace('column-', '') as TaskStatus;
      targetStatus = status;
    } else {
      const targetTask = tasks.find((task) => task.id === overId);
      targetStatus = targetTask?.status ?? null;
    }

    if (!targetStatus || targetStatus === sourceTask.status) {
      return;
    }

    actions.moveTask(taskId, targetStatus);
  };

  const saveProject = (payload: { name: string; color: string }) => {
    if (projectModalState?.mode === 'edit') {
      actions.updateProject(projectModalState.projectId, payload);
    } else {
      actions.createProject(payload);
    }

    setProjectModalState(null);
  };

  const visibleTaskCount = viewMode === 'project' ? filteredTasks.length : globalTasks.length;
  const activeTrackingTaskId = activeTracking?.taskId ?? null;
  const activeTrackingTask = activeTrackingTaskId
    ? tasks.find((task) => task.id === activeTrackingTaskId)
    : undefined;
  const activeTrackingElapsed = activeTracking
    ? formatElapsedClock((now.getTime() - new Date(activeTracking.startAt).getTime()) / 1000)
    : '00:00:00';
  const normalizedVisibleTaskCount =
    viewMode === 'dashboard' ? tasks.length : visibleTaskCount;

  const handleFiltersChange = (payload: Partial<BoardFilters>) => {
    actions.setFilters(payload);

    if (payload.due === 'today' && viewMode === 'dashboard') {
      setViewMode('global');
    }
  };

  const handleToggleDueToday = () => {
    const nextDue = filters.due === 'today' ? 'all' : 'today';
    actions.setFilters({ due: nextDue });

    if (nextDue === 'today') {
      setViewMode('global');
    }
  };

  const syncStatePayload = useMemo<AppStateV1>(
    () => ({
      version: 1,
      projects,
      tasks,
      subtasks,
      filters,
      timeSessions,
      activeTracking,
    }),
    [projects, tasks, subtasks, filters, timeSessions, activeTracking],
  );

  useEffect(() => {
    if (!isRemoteSyncEnabled()) {
      remoteReadyRef.current = true;
      remoteAvailableRef.current = false;
      return;
    }

    let cancelled = false;

    const hydrateFromRemote = async () => {
      try {
        const remote = await loadRemoteState();
        if (!remote || cancelled) {
          return;
        }

        const localState = appStoreApi.getState();
        const localPayload: AppStateV1 = {
          version: 1,
          projects: localState.projects,
          tasks: localState.tasks,
          subtasks: localState.subtasks,
          filters: localState.filters,
          timeSessions: localState.timeSessions,
          activeTracking: localState.activeTracking,
        };

        // Migracion automatica: si remoto esta vacio y local tiene datos, subimos local.
        if (!hasAnyUserData(remote) && hasAnyUserData(localPayload)) {
          await saveRemoteState(localPayload);
          remoteAvailableRef.current = true;
          lastRemoteSnapshotRef.current = JSON.stringify(localPayload);
          return;
        }

        remoteAvailableRef.current = true;
        actions.hydrateState(remote);
        lastRemoteSnapshotRef.current = JSON.stringify(remote);
      } catch {
        // Si falla remoto, mantenemos modo local y seguimos operando.
        remoteAvailableRef.current = false;
      } finally {
        if (!cancelled) {
          remoteReadyRef.current = true;
        }
      }
    };

    void hydrateFromRemote();

    return () => {
      cancelled = true;
    };
  }, [actions]);

  useEffect(() => {
    if (!isRemoteSyncEnabled() || !remoteReadyRef.current || !remoteAvailableRef.current) {
      return;
    }

    const nextSnapshot = JSON.stringify(syncStatePayload);
    if (nextSnapshot === lastRemoteSnapshotRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      void saveRemoteState(syncStatePayload)
        .then(() => {
          lastRemoteSnapshotRef.current = nextSnapshot;
        })
        .catch(() => {
          // Reintentaremos en siguientes cambios.
        });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [syncStatePayload]);

  return (
    <>
      <div className={`app-shell ${isMobileSidebarOpen ? 'sidebar-mobile-open' : ''}`}>
        <Sidebar
          projects={projects}
          tasks={tasks}
          filters={filters}
          isMobileOpen={isMobileSidebarOpen}
          onRequestClose={() => setIsMobileSidebarOpen(false)}
          onFiltersChange={handleFiltersChange}
          onResetFilters={actions.resetFilters}
          onCreateProject={() => setProjectModalState({ mode: 'create' })}
          onEditProject={(projectId) => setProjectModalState({ mode: 'edit', projectId })}
          onDeleteProject={openDeleteProjectConfirm}
        />

        <main className="workspace">
          <HeaderBar
            query={filters.query}
            totalTasks={normalizedVisibleTaskCount}
            onQueryChange={(value) => handleFiltersChange({ query: value })}
            onNewTask={() => setTaskModalState({ mode: 'create' })}
            onNewProject={() => setProjectModalState({ mode: 'create' })}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            isMobileSidebarOpen={isMobileSidebarOpen}
            activeTaskTitle={activeTrackingTask?.title ?? null}
            activeTrackingElapsed={activeTrackingElapsed}
            onStopTracking={actions.stopTracking}
          />

          <div className="view-tabs-scroll">
            <div className="view-tabs" role="tablist" aria-label="Tipo de tablero">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'project'}
                className={`view-tab ${viewMode === 'project' ? 'view-tab-active' : ''}`}
                onClick={() => setViewMode('project')}
              >
                <span className="tab-content">
                  <FolderKanban size={12} aria-hidden="true" />
                  Por proyecto
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'global'}
                className={`view-tab ${viewMode === 'global' ? 'view-tab-active' : ''}`}
                onClick={() => setViewMode('global')}
              >
                <span className="tab-content">
                  <Globe2 size={12} aria-hidden="true" />
                  Tareas globales
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'dashboard'}
                className={`view-tab ${viewMode === 'dashboard' ? 'view-tab-active' : ''}`}
                onClick={() => setViewMode('dashboard')}
              >
                <span className="tab-content">
                  <LayoutDashboard size={12} aria-hidden="true" />
                  Dashboard
                </span>
              </button>
              <button
                type="button"
                className={`view-filter ${filters.due === 'today' ? 'view-filter-active' : ''}`}
                onClick={handleToggleDueToday}
              >
                <span className="tab-content">
                  <CalendarDays size={12} aria-hidden="true" />
                  Vence hoy ({dueTodayCount})
                </span>
              </button>
            </div>
          </div>

          {viewMode === 'project' ? (
            <div className="board-scroll">
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                <div className="board-grid">
                  {statusColumns.map((column) => (
                    <Column
                      key={column.status}
                      status={column.status}
                      title={column.title}
                      tasks={tasksByStatus[column.status]}
                      projectsById={projectById}
                      subtasksByTaskId={subtasksByTaskId}
                      onOpenTaskDetail={setTaskDetailId}
                      onEditTask={(taskId) => setTaskModalState({ mode: 'edit', taskId })}
                      onDeleteTask={openDeleteTaskConfirm}
                      onStatusChange={actions.setTaskStatus}
                      onSubtaskDoneChange={actions.setSubtaskDone}
                      activeTrackingTaskId={activeTrackingTaskId}
                      onToggleTracking={actions.toggleTracking}
                      onPostpone={actions.postponeTask}
                    />
                  ))}
                </div>
              </DndContext>
            </div>
          ) : viewMode === 'global' ? (
            <GlobalPendingBoard
              tasks={globalTasks}
              projectsById={projectById}
              subtasksByTaskId={subtasksByTaskId}
              onOpenTaskDetail={setTaskDetailId}
              onEditTask={(taskId) => setTaskModalState({ mode: 'edit', taskId })}
              onDeleteTask={openDeleteTaskConfirm}
              onStatusChange={actions.setTaskStatus}
              onSubtaskDoneChange={actions.setSubtaskDone}
              activeTrackingTaskId={activeTrackingTaskId}
              onToggleTracking={actions.toggleTracking}
              onPostpone={actions.postponeTask}
            />
          ) : (
            <TimeDashboard
              tasks={tasks}
              projectsById={projectById}
              timeSessions={timeSessions}
              activeTracking={activeTracking}
              onOpenTask={setTaskDetailId}
            />
          )}
        </main>
      </div>

      {taskModalState && (
        <TaskModal
          key={taskModalState.mode === 'edit' ? taskModalState.taskId : 'task-create'}
          task={activeTask}
          taskSubtasks={activeTaskSubtasks}
          projects={projects}
          onCancel={() => setTaskModalState(null)}
          onSave={(payload) => {
            actions.saveTask(payload);
            setTaskModalState(null);
          }}
        />
      )}

      {activeDetailTask && (
        <TaskDetailModal
          key={activeDetailTask.id}
          task={activeDetailTask}
          project={activeDetailTask.projectId ? projectById.get(activeDetailTask.projectId) : undefined}
          taskSubtasks={activeDetailSubtasks}
          isTracking={activeTrackingTaskId === activeDetailTask.id}
          onClose={() => setTaskDetailId(null)}
          onOpenEditTask={(taskId) => {
            setTaskDetailId(null);
            setTaskModalState({ mode: 'edit', taskId });
          }}
          onAddSubtask={actions.addSubtask}
          onUpdateSubtask={actions.updateSubtask}
          onDeleteSubtask={actions.deleteSubtask}
          onToggleTracking={actions.toggleTracking}
        />
      )}

      {projectModalState && (
        <ProjectModal
          key={projectModalState.mode === 'edit' ? projectModalState.projectId : 'project-create'}
          project={activeProject}
          onCancel={() => setProjectModalState(null)}
          onSave={saveProject}
        />
      )}

      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          description={confirmState.description}
          confirmLabel={confirmState.confirmLabel}
          expectedText="BORRAR"
          onCancel={() => setConfirmState(null)}
          onConfirm={() => {
            confirmState.onConfirm();
            setConfirmState(null);
          }}
        />
      )}
    </>
  );
}

export default App;
