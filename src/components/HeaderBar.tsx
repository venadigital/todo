import { FolderPlus, Search, Square, SquarePlus } from 'lucide-react';

interface HeaderBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  onNewTask: () => void;
  onNewProject: () => void;
  totalTasks: number;
  activeTaskTitle: string | null;
  activeTrackingElapsed: string;
  onStopTracking: () => void;
}

export const HeaderBar = ({
  query,
  onQueryChange,
  onNewTask,
  onNewProject,
  totalTasks,
  activeTaskTitle,
  activeTrackingElapsed,
  onStopTracking,
}: HeaderBarProps) => {
  return (
    <header className="topbar">
      <div>
        <h1>✌️ To Do Vena Digital</h1>
        <p>{totalTasks} tareas visibles</p>
        {activeTaskTitle && (
          <p className="tracking-banner">
            <span className="tracking-banner__label">Trabajando ahora:</span>
            <strong className="tracking-banner__task">{activeTaskTitle}</strong>
            <span className="tracking-banner__dot">·</span>
            <span className="tracking-clock" aria-live="polite" aria-label="Tiempo transcurrido">
              {activeTrackingElapsed}
            </span>
            <span className="tracking-arcade" aria-hidden="true">
              <span className="tracking-arcade__ship" />
              <span className="tracking-arcade__pixel tracking-arcade__pixel-1" />
              <span className="tracking-arcade__pixel tracking-arcade__pixel-2" />
              <span className="tracking-arcade__pixel tracking-arcade__pixel-3" />
            </span>
            <button type="button" className="button button-danger button-small" onClick={onStopTracking}>
              <span className="button-content">
                <Square size={12} aria-hidden="true" />
                Detener
              </span>
            </button>
          </p>
        )}
      </div>

      <div className="topbar-actions">
        <div className="input-icon-wrap">
          <Search size={12} aria-hidden="true" />
          <input
            className="input"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar por título o descripción"
            aria-label="Buscar tareas"
          />
        </div>
        <button type="button" className="button button-secondary" onClick={onNewProject}>
          <span className="button-content">
            <FolderPlus size={12} aria-hidden="true" />
            Nuevo proyecto
          </span>
        </button>
        <button type="button" className="button button-primary" onClick={onNewTask}>
          <span className="button-content">
            <SquarePlus size={12} aria-hidden="true" />
            Nueva tarea
          </span>
        </button>
      </div>
    </header>
  );
};
