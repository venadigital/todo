import { FolderKanban, Globe2, ListFilter, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { BoardFilters, Project, Task } from '../types';

interface SidebarProps {
  projects: Project[];
  tasks: Task[];
  filters: BoardFilters;
  onFiltersChange: (payload: Partial<BoardFilters>) => void;
  onResetFilters: () => void;
  onCreateProject: () => void;
  onEditProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

export const Sidebar = ({
  projects,
  tasks,
  filters,
  onFiltersChange,
  onResetFilters,
  onCreateProject,
  onEditProject,
  onDeleteProject,
}: SidebarProps) => {
  return (
    <aside className="sidebar">
      <section className="sidebar-section">
        <div className="sidebar-section__header">
          <h2>
            <span className="title-with-icon">
              <FolderKanban size={12} aria-hidden="true" />
              Proyectos
            </span>
          </h2>
          <button type="button" className="button button-primary button-small" onClick={onCreateProject}>
            <Plus size={12} aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          className={`sidebar-project ${filters.projectId === 'all' ? 'sidebar-project-active' : ''}`}
          onClick={() => onFiltersChange({ projectId: 'all' })}
        >
          <span className="sidebar-project-label">
            <Globe2 size={11} aria-hidden="true" />
            Todos
          </span>
          <strong>{tasks.length}</strong>
        </button>

        {projects.map((project) => {
          const count = tasks.filter((task) => task.projectId === project.id).length;

          return (
            <div key={project.id} className="sidebar-project-row">
              <button
                type="button"
                className={`sidebar-project ${filters.projectId === project.id ? 'sidebar-project-active' : ''}`}
                onClick={() => onFiltersChange({ projectId: project.id })}
              >
                <span className="project-dot" style={{ backgroundColor: project.color }} />
                <span>{project.name}</span>
                <strong>{count}</strong>
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => onEditProject(project.id)}
                aria-label={`Editar ${project.name}`}
              >
                <Pencil size={12} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="icon-button icon-button-danger"
                onClick={() => onDeleteProject(project.id)}
                aria-label={`Borrar ${project.name}`}
              >
                <Trash2 size={12} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </section>

      <section className="sidebar-section">
        <h2>
          <span className="title-with-icon">
            <ListFilter size={12} aria-hidden="true" />
            Filtros
          </span>
        </h2>

        <label className="label">
          Estado
          <select
            className="input"
            value={filters.status}
            onChange={(event) => onFiltersChange({ status: event.target.value as BoardFilters['status'] })}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="in_progress">En progreso</option>
            <option value="done">Hecho</option>
          </select>
        </label>

        <label className="label">
          Vencimiento
          <select
            className="input"
            value={filters.due}
            onChange={(event) => onFiltersChange({ due: event.target.value as BoardFilters['due'] })}
          >
            <option value="all">Todos</option>
            <option value="overdue">Vencidas</option>
            <option value="today">Hoy</option>
            <option value="this_week">Esta semana</option>
            <option value="no_date">Sin fecha</option>
          </select>
        </label>

        <button type="button" className="button button-secondary" onClick={onResetFilters}>
          <span className="button-content">
            <RotateCcw size={12} aria-hidden="true" />
            Reiniciar filtros
          </span>
        </button>
      </section>
    </aside>
  );
};
