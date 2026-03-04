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
            Trabajando ahora: <strong>{activeTaskTitle}</strong> · {activeTrackingElapsed}
            <button type="button" className="button button-danger button-small" onClick={onStopTracking}>
              Detener
            </button>
          </p>
        )}
      </div>

      <div className="topbar-actions">
        <input
          className="input"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar por título o descripción"
          aria-label="Buscar tareas"
        />
        <button type="button" className="button button-secondary" onClick={onNewProject}>
          Nuevo proyecto
        </button>
        <button type="button" className="button button-primary" onClick={onNewTask}>
          Nueva tarea
        </button>
      </div>
    </header>
  );
};
