import { useMemo, useState } from 'react';
import {
  DragOverlay,
  DndContext,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Flame, FolderKanban, GripVertical, ListTodo, Plus, Trash2 } from 'lucide-react';
import type { CollisionDetection, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { FormEvent } from 'react';
import type { Project, QuickTask } from '../types';

interface QuickPriorityPanelProps {
  projects: Project[];
  quickTasks: QuickTask[];
  onCreateQuickTask: (title: string) => void;
  onAssignQuickTaskToProject: (quickTaskId: string, projectId: string | null) => void;
  onToggleQuickTask: (quickTaskId: string) => void;
  onDeleteQuickTask: (quickTaskId: string) => void;
  onClearDoneQuickTasks: () => void;
}

interface QuickPriorityItemProps {
  quickTask: QuickTask;
  onToggleQuickTask: (quickTaskId: string) => void;
  onDeleteQuickTask: (quickTaskId: string) => void;
}

interface QuickPriorityDropzoneProps {
  id: string;
  label: string;
  color: string;
}

const quickTaskDragId = (quickTaskId: string) => `quick-task-${quickTaskId}`;
const quickDropId = (projectId: string | null) => `quick-drop-${projectId ?? 'none'}`;

const QuickPriorityItem = ({ quickTask, onToggleQuickTask, onDeleteQuickTask }: QuickPriorityItemProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: quickTaskDragId(quickTask.id),
    data: {
      type: 'quick-task',
      quickTaskId: quickTask.id,
    },
  });

  const style = {
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`quick-priority-item ${quickTask.done ? 'quick-priority-item-done' : ''} ${
        isDragging ? 'quick-priority-item-dragging' : ''
      }`}
    >
      <button
        type="button"
        className="quick-priority-item__drag-handle"
        aria-label={`Arrastrar prioridad ${quickTask.title}`}
        {...listeners}
        {...attributes}
      >
        <GripVertical size={12} aria-hidden="true" />
      </button>

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
  );
};

const QuickPriorityDropzone = ({ id, label, color }: QuickPriorityDropzoneProps) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className={`quick-priority-dropzone ${isOver ? 'quick-priority-dropzone-over' : ''}`}>
      <span className="quick-priority-dropzone__dot" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
};

export const QuickPriorityPanel = ({
  projects,
  quickTasks,
  onCreateQuickTask,
  onAssignQuickTaskToProject,
  onToggleQuickTask,
  onDeleteQuickTask,
  onClearDoneQuickTasks,
}: QuickPriorityPanelProps) => {
  const [title, setTitle] = useState('');
  const [draggingQuickTaskId, setDraggingQuickTaskId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    }),
  );

  const pendingCount = useMemo(
    () => quickTasks.filter((quickTask) => !quickTask.done).length,
    [quickTasks],
  );

  const doneCount = quickTasks.length - pendingCount;
  const draggingQuickTask = useMemo(
    () => quickTasks.find((quickTask) => quickTask.id === draggingQuickTaskId) ?? null,
    [quickTasks, draggingQuickTaskId],
  );
  const dropTargets = useMemo(
    () => [
      { id: quickDropId(null), label: 'Sin proyecto', color: '#8f9eb5' },
      ...projects.map((project) => ({
        id: quickDropId(project.id),
        label: project.name,
        color: project.color,
      })),
    ],
    [projects],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    onCreateQuickTask(trimmed);
    setTitle('');
  };

  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }

    return rectIntersection(args);
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    const activeId = String(active.id);
    if (!activeId.startsWith('quick-task-')) {
      setDraggingQuickTaskId(null);
      return;
    }

    setDraggingQuickTaskId(activeId.replace('quick-task-', ''));
  };

  const handleDragCancel = () => {
    setDraggingQuickTaskId(null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggingQuickTaskId(null);

    if (!over) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId.startsWith('quick-task-') || !overId.startsWith('quick-drop-')) {
      return;
    }

    const quickTaskId = activeId.replace('quick-task-', '');
    const projectToken = overId.replace('quick-drop-', '');
    const projectId = projectToken === 'none' ? null : projectToken;
    onAssignQuickTaskToProject(quickTaskId, projectId);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <section
        className={`quick-priority-panel ${draggingQuickTaskId ? 'quick-priority-panel-dragging' : ''}`}
        aria-label="Lista rápida de prioridades"
      >
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

        <div className="quick-priority-dropzones-wrap">
          <p className="quick-priority-dropzones__label">
            <span className="title-with-icon">
              <FolderKanban size={12} aria-hidden="true" />
              Arrastra una prioridad y suéltala en un proyecto
            </span>
          </p>
          <div className="quick-priority-dropzones">
            {dropTargets.map((target) => (
              <QuickPriorityDropzone key={target.id} id={target.id} label={target.label} color={target.color} />
            ))}
          </div>
        </div>

        {quickTasks.length === 0 ? (
          <p className="quick-priority-panel__empty">Sin prioridades rápidas por ahora.</p>
        ) : (
          <div className="quick-priority-panel__list">
            {quickTasks.map((quickTask) => (
              <QuickPriorityItem
                key={quickTask.id}
                quickTask={quickTask}
                onToggleQuickTask={onToggleQuickTask}
                onDeleteQuickTask={onDeleteQuickTask}
              />
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
      <DragOverlay>
        {draggingQuickTask ? (
          <div className="quick-priority-drag-overlay">
            <GripVertical size={12} aria-hidden="true" />
            <span>{draggingQuickTask.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
