import { useEffect, useMemo, useState } from 'react';
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
import { formatMinutes } from './lib/timeTracking';
import { useAppStore } from './store/createAppStore';
import { filterTasks } from './store/selectors';
import type { DragEndEvent } from '@dnd-kit/core';
import type { TaskStatus } from './types';

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
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => window.clearInterval(interval);
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

  const filteredTasks = useMemo(() => filterTasks(tasks, filters).sort(sortTasks), [tasks, filters]);

  const tasksByStatus = useMemo(() => {
    return {
      pending: filteredTasks.filter((task) => task.status === 'pending'),
      in_progress: filteredTasks.filter((task) => task.status === 'in_progress'),
      done: filteredTasks.filter((task) => task.status === 'done'),
    };
  }, [filteredTasks]);

  const globalPendingTasks = useMemo(() => {
    return filterTasks(tasks, {
      query: filters.query,
      projectId: 'all',
      status: 'pending',
      due: filters.due,
    }).sort(sortTasks);
  }, [tasks, filters.query, filters.due]);

  const dueTodayCount = useMemo(() => {
    return filterTasks(tasks, {
      query: filters.query,
      projectId: filters.projectId,
      status: filters.status,
      due: 'today',
    }).length;
  }, [tasks, filters.query, filters.projectId, filters.status]);

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

  const visibleTaskCount = viewMode === 'project' ? filteredTasks.length : globalPendingTasks.length;
  const activeTrackingTaskId = activeTracking?.taskId ?? null;
  const activeTrackingTask = activeTrackingTaskId
    ? tasks.find((task) => task.id === activeTrackingTaskId)
    : undefined;
  const activeTrackingElapsed = activeTracking
    ? formatMinutes((now.getTime() - new Date(activeTracking.startAt).getTime()) / 1000 / 60)
    : '0m';
  const normalizedVisibleTaskCount =
    viewMode === 'dashboard' ? tasks.length : visibleTaskCount;

  return (
    <>
      <div className="app-shell">
        <Sidebar
          projects={projects}
          tasks={tasks}
          filters={filters}
          onFiltersChange={actions.setFilters}
          onResetFilters={actions.resetFilters}
          onCreateProject={() => setProjectModalState({ mode: 'create' })}
          onEditProject={(projectId) => setProjectModalState({ mode: 'edit', projectId })}
          onDeleteProject={openDeleteProjectConfirm}
        />

        <main className="workspace">
          <HeaderBar
            query={filters.query}
            totalTasks={normalizedVisibleTaskCount}
            onQueryChange={(value) => actions.setFilters({ query: value })}
            onNewTask={() => setTaskModalState({ mode: 'create' })}
            onNewProject={() => setProjectModalState({ mode: 'create' })}
            activeTaskTitle={activeTrackingTask?.title ?? null}
            activeTrackingElapsed={activeTrackingElapsed}
            onStopTracking={actions.stopTracking}
          />

          <div className="view-tabs" role="tablist" aria-label="Tipo de tablero">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'project'}
              className={`view-tab ${viewMode === 'project' ? 'view-tab-active' : ''}`}
              onClick={() => setViewMode('project')}
            >
              Por proyecto
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'global'}
              className={`view-tab ${viewMode === 'global' ? 'view-tab-active' : ''}`}
              onClick={() => setViewMode('global')}
            >
              Tareas globales
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'dashboard'}
              className={`view-tab ${viewMode === 'dashboard' ? 'view-tab-active' : ''}`}
              onClick={() => setViewMode('dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className={`view-filter ${filters.due === 'today' ? 'view-filter-active' : ''}`}
              onClick={() => actions.setFilters({ due: filters.due === 'today' ? 'all' : 'today' })}
            >
              Vence hoy ({dueTodayCount})
            </button>
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
              tasks={globalPendingTasks}
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
