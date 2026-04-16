import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { makeId } from '../lib/ids';
import type { TaskEditorPayload } from '../store/createAppStore';
import type { Priority, Project, Subtask, Task, TaskStatus } from '../types';

interface EditableSubtask {
  id: string;
  title: string;
  done: boolean;
}

interface TaskModalProps {
  task?: Task;
  taskSubtasks: Subtask[];
  projects: Project[];
  onCancel: () => void;
  onSave: (payload: TaskEditorPayload) => void;
}

const statusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'done', label: 'Hecho' },
];

const priorityOptions: Array<{ value: Priority; label: string }> = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
];

export const TaskModal = ({ task, taskSubtasks, projects, onCancel, onSave }: TaskModalProps) => {
  const sortEditableSubtasks = (items: EditableSubtask[]): EditableSubtask[] => {
    const pending = items.filter((subtask) => !subtask.done);
    const done = items.filter((subtask) => subtask.done);
    return [...pending, ...done];
  };

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [projectId, setProjectId] = useState<string>(task?.projectId ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'pending');
  const [progress, setProgress] = useState(task?.progress ?? 0);
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [subtasks, setSubtasks] = useState<EditableSubtask[]>(
    sortEditableSubtasks(
      taskSubtasks.map((subtask) => ({
        id: subtask.id,
        title: subtask.title,
        done: subtask.done,
      })),
    ),
  );

  const hasSubtasks = subtasks.filter((subtask) => subtask.title.trim().length > 0).length > 0;

  const computedProgress = useMemo(() => {
    if (!hasSubtasks) {
      return progress;
    }

    const validSubtasks = subtasks.filter((subtask) => subtask.title.trim().length > 0);
    if (validSubtasks.length === 0) {
      return 0;
    }

    const doneCount = validSubtasks.filter((subtask) => subtask.done).length;
    return Math.round((doneCount / validSubtasks.length) * 100);
  }, [hasSubtasks, progress, subtasks]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    onSave({
      id: task?.id,
      title: trimmed,
      description,
      projectId: projectId || null,
      status,
      progress: hasSubtasks ? computedProgress : progress,
      priority,
      dueDate: dueDate || null,
      subtasks,
    });
  };

  const addSubtask = () => {
    setSubtasks((current) =>
      sortEditableSubtasks([...current, { id: makeId('subtask'), title: '', done: false }]),
    );
  };

  const updateSubtask = (subtaskId: string, patch: Partial<EditableSubtask>) => {
    setSubtasks((current) =>
      sortEditableSubtasks(
        current.map((subtask) => (subtask.id === subtaskId ? { ...subtask, ...patch } : subtask)),
      ),
    );
  };

  const removeSubtask = (subtaskId: string) => {
    setSubtasks((current) => current.filter((subtask) => subtask.id !== subtaskId));
  };

  const moveSubtask = (subtaskId: string, direction: 'up' | 'down') => {
    setSubtasks((current) => {
      const ordered = sortEditableSubtasks(current);
      const selected = ordered.find((subtask) => subtask.id === subtaskId);
      if (!selected) {
        return current;
      }

      const group = ordered.filter((subtask) => subtask.done === selected.done);
      const currentIndex = group.findIndex((subtask) => subtask.id === subtaskId);
      if (currentIndex < 0) {
        return current;
      }

      const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0 || nextIndex >= group.length) {
        return current;
      }

      const reorderedGroup = [...group];
      [reorderedGroup[currentIndex], reorderedGroup[nextIndex]] = [
        reorderedGroup[nextIndex],
        reorderedGroup[currentIndex],
      ];

      const pending = selected.done ? ordered.filter((subtask) => !subtask.done) : reorderedGroup;
      const done = selected.done ? reorderedGroup : ordered.filter((subtask) => subtask.done);

      return [...pending, ...done];
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div className="modal modal-large" role="dialog" aria-modal="true" aria-label="Tarea" onClick={(event) => event.stopPropagation()}>
        <h3>{task ? 'Editar tarea' : 'Nueva tarea'}</h3>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="label">
            Título
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. Implementar drag and drop"
              autoFocus
              required
            />
          </label>

          <label className="label">
            Descripción
            <textarea
              className="input textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Detalles técnicos de la tarea"
            />
          </label>

          <div className="form-row">
            <label className="label">
              Proyecto
              <select className="input" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                <option value="">Sin proyecto</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="label">
              Prioridad
              <select className="input" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label className="label">
              Estado
              <select className="input" value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="label">
              Vencimiento
              <input className="input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </label>
          </div>

          <label className="label">
            Progreso: {hasSubtasks ? computedProgress : progress}%
            <input
              type="range"
              min={0}
              max={100}
              className="range"
              value={hasSubtasks ? computedProgress : progress}
              onChange={(event) => setProgress(Number(event.target.value))}
              disabled={hasSubtasks}
            />
          </label>

          <section className="subtasks-section">
            <div className="subtasks-header">
              <h4>Subtareas</h4>
              <button type="button" className="button button-secondary" onClick={addSubtask}>
                + Subtarea
              </button>
            </div>

            {subtasks.length === 0 ? (
              <p className="muted">Sin subtareas todavía.</p>
            ) : (
              <div className="subtasks-list">
                {subtasks.map((subtask) => {
                  const group = subtasks.filter((item) => item.done === subtask.done);
                  const indexInGroup = group.findIndex((item) => item.id === subtask.id);
                  const canMoveUp = indexInGroup > 0;
                  const canMoveDown = indexInGroup >= 0 && indexInGroup < group.length - 1;

                  return (
                  <div key={subtask.id} className="subtask-row">
                    <input
                      type="checkbox"
                      checked={subtask.done}
                      onChange={(event) => updateSubtask(subtask.id, { done: event.target.checked })}
                    />
                    <input
                      className="input"
                      value={subtask.title}
                      onChange={(event) => updateSubtask(subtask.id, { title: event.target.value })}
                      placeholder="Descripción de la subtarea"
                    />
                    <button
                      type="button"
                      className="button button-secondary button-icon"
                      onClick={() => moveSubtask(subtask.id, 'up')}
                      disabled={!canMoveUp}
                      aria-label="Mover subtarea arriba"
                    >
                      <ArrowUp size={12} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="button button-secondary button-icon"
                      onClick={() => moveSubtask(subtask.id, 'down')}
                      disabled={!canMoveDown}
                      aria-label="Mover subtarea abajo"
                    >
                      <ArrowDown size={12} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="button button-danger button-icon"
                      onClick={() => removeSubtask(subtask.id)}
                      aria-label="Eliminar subtarea"
                    >
                      <Trash2 size={12} aria-hidden="true" />
                    </button>
                  </div>
                );
                })}
              </div>
            )}
          </section>

          <div className="modal-actions">
            <button type="button" className="button button-secondary" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="button button-primary">
              Guardar tarea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
