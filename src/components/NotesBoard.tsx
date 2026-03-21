import { useMemo } from 'react';
import { Pin, PinOff, Plus, StickyNote, Trash2 } from 'lucide-react';
import type { Note, NoteColor } from '../types';

interface NotesBoardProps {
  notes: Note[];
  query: string;
  onCreateNote: () => void;
  onUpdateNote: (noteId: string, payload: { title?: string; content?: string; color?: NoteColor }) => void;
  onDeleteNote: (noteId: string) => void;
  onToggleNotePinned: (noteId: string) => void;
}

const noteColorOptions: Array<{ color: NoteColor; label: string; className: string }> = [
  { color: 'lime', label: 'Lima', className: 'note-card-lime' },
  { color: 'cyan', label: 'Cian', className: 'note-card-cyan' },
  { color: 'amber', label: 'Ambar', className: 'note-card-amber' },
  { color: 'violet', label: 'Violeta', className: 'note-card-violet' },
  { color: 'rose', label: 'Rosa', className: 'note-card-rose' },
];

const colorClassByValue = new Map(noteColorOptions.map((entry) => [entry.color, entry.className]));

const includesQuery = (note: Note, query: string): boolean => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return (
    note.title.toLowerCase().includes(normalized) ||
    note.content.toLowerCase().includes(normalized)
  );
};

const sortNotes = (a: Note, b: Note): number => {
  if (a.pinned !== b.pinned) {
    return a.pinned ? -1 : 1;
  }

  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
};

export const NotesBoard = ({
  notes,
  query,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onToggleNotePinned,
}: NotesBoardProps) => {
  const filteredNotes = useMemo(
    () => notes.filter((note) => includesQuery(note, query)).sort(sortNotes),
    [notes, query],
  );

  const pinnedCount = filteredNotes.filter((note) => note.pinned).length;

  return (
    <section className="notes-board" aria-label="Tablero de notas">
      <header className="notes-board__header">
        <div>
          <h3>
            <span className="title-with-icon">
              <StickyNote size={13} aria-hidden="true" />
              Notas rápidas
            </span>
          </h3>
          <p>
            {filteredNotes.length} visibles · {pinnedCount} fijadas
          </p>
        </div>
        <button type="button" className="button button-primary" onClick={onCreateNote}>
          <span className="button-content">
            <Plus size={12} aria-hidden="true" />
            Nueva nota
          </span>
        </button>
      </header>

      {filteredNotes.length === 0 ? (
        <p className="notes-board__empty">
          No hay notas para mostrar. Crea una nota nueva o ajusta la búsqueda.
        </p>
      ) : (
        <div className="notes-board__grid">
          {filteredNotes.map((note) => (
            <article
              key={note.id}
              className={`note-card ${colorClassByValue.get(note.color) ?? 'note-card-lime'}`}
            >
              <div className="note-card__actions">
                <button
                  type="button"
                  className={`button button-small ${note.pinned ? 'button-primary' : 'button-secondary'}`}
                  onClick={() => onToggleNotePinned(note.id)}
                  aria-label={note.pinned ? 'Desfijar nota' : 'Fijar nota'}
                >
                  <span className="button-content">
                    {note.pinned ? <Pin size={12} aria-hidden="true" /> : <PinOff size={12} aria-hidden="true" />}
                    {note.pinned ? 'Fijada' : 'Fijar'}
                  </span>
                </button>

                <button
                  type="button"
                  className="button button-danger button-small"
                  onClick={() => onDeleteNote(note.id)}
                  aria-label={`Eliminar nota ${note.title}`}
                >
                  <span className="button-content">
                    <Trash2 size={12} aria-hidden="true" />
                    Borrar
                  </span>
                </button>
              </div>

              <input
                className="input note-card__title"
                maxLength={120}
                value={note.title}
                onChange={(event) => onUpdateNote(note.id, { title: event.target.value })}
                placeholder="Titulo de la nota"
                aria-label="Titulo de la nota"
              />

              <textarea
                className="textarea note-card__content"
                maxLength={1200}
                value={note.content}
                onChange={(event) => onUpdateNote(note.id, { content: event.target.value })}
                placeholder="Escribe aqui tus apuntes..."
                aria-label="Contenido de la nota"
              />

              <div className="note-card__footer">
                <div className="note-card__palette" role="radiogroup" aria-label="Color de nota">
                  {noteColorOptions.map((option) => (
                    <button
                      key={option.color}
                      type="button"
                      role="radio"
                      aria-checked={note.color === option.color}
                      aria-label={`Color ${option.label}`}
                      className={`note-color-option ${option.className} ${
                        note.color === option.color ? 'note-color-option-active' : ''
                      }`}
                      onClick={() => onUpdateNote(note.id, { color: option.color })}
                    />
                  ))}
                </div>
                <span className="note-card__updated">
                  Editada:{' '}
                  {new Date(note.updatedAt).toLocaleString('es-CO', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
