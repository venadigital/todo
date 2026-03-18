import { useMemo, useState } from 'react';
import { Flame, ListTodo, Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import type { QuickTask } from '../types';

interface QuickPriorityPanelProps {
  quickTasks: QuickTask[];
  onCreateQuickTask: (title: string) => void;
  onToggleQuickTask: (quickTaskId: string) => void;
  onDeleteQuickTask: (quickTaskId: string) => void;
  onClearDoneQuickTasks: () => void;
}

export const QuickPriorityPanel = ({
  quickTasks,
  onCreateQuickTask,
  onToggleQuickTask,
  onDeleteQuickTask,
  onClearDoneQuickTasks,
}: QuickPriorityPanelProps) => {
  const [title, setTitle] = useState('');

  const pendingCount = useMemo(
    () => quickTasks.filter((quickTask) => !quickTask.done).length,
    [quickTasks],
  );

  const doneCount = quickTasks.length - pendingCount;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    onCreateQuickTask(trimmed);
    setTitle('');
  };

  return (
    <section className="quick-priority-panel" aria-label="Lista rápida de prioridades">
      <header className="quick-priority-panel__header">
        <h3>
          <span className="title-with-icon">
            <Flame size={13} aria-hidden="true" />
            Prioridades rápidas
          </span>
        </h3>
        <span>{pendingCount} pendientes</span>
      </header>

      <form className="quick-priority-panel__create" onSubmit={handleSubmit}>
        <div className="input-icon-wrap quick-priority-panel__input">
          <ListTodo size={12} aria-hidden="true" />
          <input
            className="input"
            placeholder="Agregar tarea prioritaria rápida"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <button type="submit" className="button button-primary">
          <span className="button-content">
            <Plus size={12} aria-hidden="true" />
            Agregar
          </span>
        </button>
      </form>

      {quickTasks.length === 0 ? (
        <p className="quick-priority-panel__empty">Sin prioridades rápidas por ahora.</p>
      ) : (
        <div className="quick-priority-panel__list">
          {quickTasks.map((quickTask) => (
            <div
              key={quickTask.id}
              className={`quick-priority-item ${quickTask.done ? 'quick-priority-item-done' : ''}`}
            >
              <label className="quick-priority-item__title">
                <input
                  type="checkbox"
                  checked={quickTask.done}
                  onChange={() => onToggleQuickTask(quickTask.id)}
                />
                <span>{quickTask.title}</span>
              </label>
              <button
                type="button"
                className="button button-danger button-icon"
                onClick={() => onDeleteQuickTask(quickTask.id)}
                aria-label={`Eliminar prioridad ${quickTask.title}`}
              >
                <Trash2 size={12} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {doneCount > 0 && (
        <div className="quick-priority-panel__footer">
          <span>{doneCount} completadas</span>
          <button type="button" className="button button-secondary button-small" onClick={onClearDoneQuickTasks}>
            Limpiar completadas
          </button>
        </div>
      )}
    </section>
  );
};
