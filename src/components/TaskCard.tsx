import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { ProgressBar } from './ProgressBar';
import type { Priority, Project, Subtask, Task, TaskStatus } from '../types';

interface TaskCardProps {
  task: Task;
  project?: Project;
  taskSubtasks: Subtask[];
  subtaskTotal: number;
  subtaskDone: number;
  onEdit: (taskId: string) => void;
  onOpenDetail: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSubtaskDoneChange: (subtaskId: string, done: boolean) => void;
  isTracking: boolean;
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

export const TaskCard = ({
  task,
  project,
  taskSubtasks,
  subtaskTotal,
  subtaskDone,
  onEdit,
  onOpenDetail,
  onDelete,
  onStatusChange,
  onSubtaskDoneChange,
  isTracking,
  onToggleTracking,
  onPostpone,
}: TaskCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      status: task.status,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`task-card ${isDragging ? 'task-card-dragging' : ''}`}
      aria-label={`Tarea ${task.title}`}
    >
      <div className="task-card__header">
        <button className="drag-handle" type="button" aria-label="Mover tarea" {...attributes} {...listeners}>
          :::
        </button>
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

      {subtaskTotal > 0 && (
        <div className="task-subtasks-block">
          <p className="task-subtasks-info">
            Subtareas: {subtaskDone}/{subtaskTotal}
          </p>
          <div className="task-subtasks-list">
            {taskSubtasks.map((subtask) => (
              <label key={subtask.id} className={`task-subtask-row ${subtask.done ? 'task-subtask-row-done' : ''}`}>
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
          className={`button button-small ${isTracking ? 'button-danger' : 'button-secondary'}`}
          onClick={() => onToggleTracking(task.id)}
        >
          {isTracking ? 'Detener tiempo' : 'Trabajar ahora'}
        </button>

        <button type="button" className="button button-secondary button-small" onClick={() => onPostpone(task.id, 1)}>
          +1d
        </button>
        <button type="button" className="button button-secondary button-small" onClick={() => onPostpone(task.id, 3)}>
          +3d
        </button>
        <button type="button" className="button button-secondary button-small" onClick={() => onPostpone(task.id, 7)}>
          +7d
        </button>
      </div>

      <div className="task-actions">
        <button type="button" className="button button-secondary" onClick={() => onOpenDetail(task.id)}>
          Detalle
        </button>
        <button type="button" className="button button-secondary" onClick={() => onEdit(task.id)}>
          Editar
        </button>
        <button type="button" className="button button-danger" onClick={() => onDelete(task.id)}>
          Borrar
        </button>
      </div>
    </article>
  );
};
