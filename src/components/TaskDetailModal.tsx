import { useMemo, useState } from 'react';
import { Pause, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import type { FormEvent, KeyboardEvent } from 'react';
import type { Project, Subtask, Task } from '../types';

interface TaskDetailModalProps {
  task: Task;
  project?: Project;
  taskSubtasks: Subtask[];
  isTracking: boolean;
  onClose: () => void;
  onOpenEditTask: (taskId: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onUpdateSubtask: (subtaskId: string, payload: { title?: string; done?: boolean }) => void;
  onDeleteSubtask: (subtaskId: string) => void;
  onToggleTracking: (taskId: string) => void;
}

export const TaskDetailModal = ({
  task,
  project,
  taskSubtasks,
  isTracking,
  onClose,
  onOpenEditTask,
  onAddSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
  onToggleTracking,
}: TaskDetailModalProps) => {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const doneCount = useMemo(
    () => taskSubtasks.filter((subtask) => subtask.done).length,
    [taskSubtasks],
  );

  const handleAddSubtask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) {
      return;
    }

    onAddSubtask(task.id, trimmed);
    setNewSubtaskTitle('');
  };

  const handleSubtaskInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    subtask: Subtask,
  ) => {
    if (event.key !== 'Enter') {
      return;
    }

    const target = event.currentTarget;
    const value = target.value.trim();
    if (!value) {
      target.value = subtask.title;
      return;
    }

    if (value !== subtask.title) {
      onUpdateSubtask(subtask.id, { title: value });
    }

    target.blur();
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal modal-large"
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle ${task.title}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="task-detail-header">
          <div>
            <h3>{task.title}</h3>
            <p>{task.description || 'Sin descripción'}</p>
          </div>
          <div className="task-detail-header__actions">
            <button
              type="button"
              className={`button button-small ${isTracking ? 'button-danger' : 'button-secondary'}`}
              onClick={() => onToggleTracking(task.id)}
            >
              <span className="button-content">
                {isTracking ? <Pause size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
                {isTracking ? 'Detener tiempo' : 'Trabajar ahora'}
              </span>
            </button>
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={() => onOpenEditTask(task.id)}
            >
              <span className="button-content">
                <Pencil size={12} aria-hidden="true" />
                Editar tarea
              </span>
            </button>
          </div>
        </header>

        <div className="task-meta-row">
          <span className="chip">
            Estado:{' '}
            {task.status === 'in_progress' ? 'En progreso' : task.status === 'done' ? 'Hecho' : 'Pendiente'}
          </span>
          <span className="chip">
            Prioridad: {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
          </span>
          <span className="chip">Proyecto: {project?.name ?? 'Sin proyecto'}</span>
          <span className="chip">Vence: {task.dueDate ?? 'sin fecha'}</span>
        </div>

        <div className="task-progress-row">
          <ProgressBar value={task.progress} />
          <span>{task.progress}%</span>
        </div>

        <section className="task-detail-subtasks">
          <div className="task-detail-subtasks__header">
            <h4>Subtareas</h4>
            <span>
              {doneCount}/{taskSubtasks.length} completadas
            </span>
          </div>

          <form className="task-detail-subtasks__create" onSubmit={handleAddSubtask}>
            <input
              className="input"
              value={newSubtaskTitle}
              onChange={(event) => setNewSubtaskTitle(event.target.value)}
              placeholder="Nueva subtarea"
            />
            <button type="submit" className="button button-primary button-small">
              <span className="button-content">
                <Plus size={12} aria-hidden="true" />
                Agregar
              </span>
            </button>
          </form>

          {taskSubtasks.length === 0 ? (
            <p className="muted">No hay subtareas todavía.</p>
          ) : (
            <div className="task-detail-subtasks__list">
              {taskSubtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className={`task-detail-subtask ${subtask.done ? 'task-detail-subtask-done' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={subtask.done}
                    onChange={(event) => onUpdateSubtask(subtask.id, { done: event.target.checked })}
                  />
                  <input
                    className="input"
                    defaultValue={subtask.title}
                    onBlur={(event) => {
                      const value = event.currentTarget.value.trim();
                      if (!value) {
                        event.currentTarget.value = subtask.title;
                        return;
                      }

                      if (value !== subtask.title) {
                        onUpdateSubtask(subtask.id, { title: value });
                      }
                    }}
                    onKeyDown={(event) => handleSubtaskInputKeyDown(event, subtask)}
                  />
                  <button
                    type="button"
                    className="button button-danger button-icon"
                    onClick={() => onDeleteSubtask(subtask.id)}
                  >
                    <Trash2 size={12} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="modal-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>
            <span className="button-content">
              <X size={12} aria-hidden="true" />
              Cerrar
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
