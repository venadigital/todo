import { ProgressBar } from './ProgressBar';
import type { Priority, Project, Subtask, Task, TaskStatus } from '../types';

interface GlobalPendingBoardProps {
  tasks: Task[];
  projectsById: Map<string, Project>;
  subtasksByTaskId: Map<string, Subtask[]>;
  onOpenTaskDetail: (taskId: string) => void;
  onEditTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSubtaskDoneChange: (subtaskId: string, done: boolean) => void;
  activeTrackingTaskId: string | null;
  onToggleTracking: (taskId: string) => void;
  onPostpone: (taskId: string, days: number) => void;
}

const priorityLabels: Record<Priority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

const statusLabels: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  done: 'Hecho',
};

export const GlobalPendingBoard = ({
  tasks,
  projectsById,
  subtasksByTaskId,
  onOpenTaskDetail,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onSubtaskDoneChange,
  activeTrackingTaskId,
  onToggleTracking,
  onPostpone,
}: GlobalPendingBoardProps) => {
  return (
    <section className="global-board">
      <header className="global-board__header">
        <h3>Pendientes Globales</h3>
        <span>{tasks.length}</span>
      </header>

      {tasks.length === 0 ? (
        <p className="global-board__empty">No hay tareas pendientes globales para los filtros actuales.</p>
      ) : (
        <div className="global-board__grid">
          {tasks.map((task) => {
            const taskSubtasks = subtasksByTaskId.get(task.id) ?? [];
            const subtaskDone = taskSubtasks.filter((subtask) => subtask.done).length;
            const project = task.projectId ? projectsById.get(task.projectId) : undefined;

            return (
              <article key={task.id} className="task-card">
                <div className="task-card__header">
                  <h4>{task.title}</h4>
                </div>

                {task.description && <p className="task-card__description">{task.description}</p>}

                <div className="task-meta-row">
                  <span className={`chip chip-priority chip-${task.priority}`}>{priorityLabels[task.priority]}</span>
                  <span className="chip chip-status">{statusLabels[task.status]}</span>
                  {project ? (
                    <span className="chip chip-project" style={{ borderColor: project.color }}>
                      <span className="chip-project-dot" style={{ backgroundColor: project.color }} />
                      {project.name}
                    </span>
                  ) : (
                    <span className="chip">Sin proyecto</span>
                  )}
                </div>

                <div className="task-progress-row">
                  <ProgressBar value={task.progress} />
                  <span>{task.progress}%</span>
                </div>

                {taskSubtasks.length > 0 && (
                  <div className="task-subtasks-block">
                    <p className="task-subtasks-info">
                      Subtareas: {subtaskDone}/{taskSubtasks.length}
                    </p>
                    <div className="task-subtasks-list">
                      {taskSubtasks.map((subtask) => (
                        <label
                          key={subtask.id}
                          className={`task-subtask-row ${subtask.done ? 'task-subtask-row-done' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={subtask.done}
                            onChange={(event) => onSubtaskDoneChange(subtask.id, event.target.checked)}
                          />
                          <span className="task-subtask-title">{subtask.title}</span>
                          <span className="task-subtask-status">{subtask.done ? 'Hecha' : 'Pendiente'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="task-date-row">
                  <span>Vence: {task.dueDate ?? 'sin fecha'}</span>
                  <span>Pospuesta: {task.postponedCount}</span>
                </div>

                <div className="task-actions">
                  <select
                    className="input"
                    value={task.status}
                    onChange={(event) => onStatusChange(task.id, event.target.value as TaskStatus)}
                    aria-label="Cambiar estado"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="in_progress">En progreso</option>
                    <option value="done">Hecho</option>
                  </select>
                  <button
                    type="button"
                    className={`button button-small ${
                      activeTrackingTaskId === task.id ? 'button-danger' : 'button-secondary'
                    }`}
                    onClick={() => onToggleTracking(task.id)}
                  >
                    {activeTrackingTaskId === task.id ? 'Detener tiempo' : 'Trabajar ahora'}
                  </button>

                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => onPostpone(task.id, 1)}
                  >
                    +1d
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => onPostpone(task.id, 3)}
                  >
                    +3d
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => onPostpone(task.id, 7)}
                  >
                    +7d
                  </button>
                </div>

                <div className="task-actions">
                  <button type="button" className="button button-secondary" onClick={() => onOpenTaskDetail(task.id)}>
                    Detalle
                  </button>
                  <button type="button" className="button button-secondary" onClick={() => onEditTask(task.id)}>
                    Editar
                  </button>
                  <button type="button" className="button button-danger" onClick={() => onDeleteTask(task.id)}>
                    Borrar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
