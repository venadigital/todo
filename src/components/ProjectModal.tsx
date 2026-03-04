import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Project } from '../types';

interface ProjectModalProps {
  project?: Project;
  onCancel: () => void;
  onSave: (payload: { name: string; color: string }) => void;
}

export const ProjectModal = ({ project, onCancel, onSave }: ProjectModalProps) => {
  const [name, setName] = useState(project?.name ?? '');
  const [color, setColor] = useState(project?.color ?? '#3b82f6');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    onSave({
      name: trimmed,
      color,
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Proyecto" onClick={(event) => event.stopPropagation()}>
        <h3>{project ? 'Editar proyecto' : 'Nuevo proyecto'}</h3>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="label">
            Nombre
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Frontend core"
              autoFocus
              required
            />
          </label>

          <label className="label">
            Color
            <input
              className="input input-color"
              value={color}
              type="color"
              onChange={(event) => setColor(event.target.value)}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="button button-secondary" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="button button-primary">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
