import { useMemo } from 'react';
import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Layers3 } from 'lucide-react';
import { TaskCard } from './TaskCard';
import type { DragEndEvent } from '@dnd-kit/core';
import type { Priority, Project, Subtask, Task, TaskStatus } from '../types';

interface PriorityBoardProps {
  tasks: Task[];
  projectsById: Map<string, Project>;
  subtasksByTaskId: Map<string, Subtask[]>;
  onOpenTaskDetail: (taskId: string) => void;
  onEditTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSubtaskDoneChange: (subtaskId: string, done: boolean) => void;
  activeTrackingTaskId: string | null;
  onToggleTracking: (taskId: string) => void;
  onPostpone: (taskId: string, days: number) => void;
  onPriorityChange: (taskId: string, priority: Priority) => void;
  onReorderWithinPriority: (priority: Priority, orderedTaskIds: string[]) => void;
}

interface PriorityColumnProps {
  priority: Priority;
  title: string;
  tasks: Task[];
  projectsById: Map<string, Project>;
  subtasksByTaskId: Map<string, Subtask[]>;
  onOpenTaskDetail: (taskId: string) => void;
  onEditTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSubtaskDoneChange: (subtaskId: string, done: boolean) => void;
  activeTrackingTaskId: string | null;
  onToggleTracking: (taskId: string) => void;
  onPostpone: (taskId: string, days: number) => void;
}

const priorityColumns: Array<{ priority: Priority; title: string }> = [
  { priority: 'high', title: 'Alta' },
  { priority: 'medium', title: 'Media' },
  { priority: 'low', title: 'Baja' },
];

const priorityColumnId = (priority: Priority) => `priority-column-${priority}`;

const sortByUpdatedAtDesc = (a: Task, b: Task) =>
  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

const PriorityColumn = ({
  priority,
  title,
  tasks,
  projectsById,
  subtasksByTaskId,
  onOpenTaskDetail,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onSubtaskDoneChange,
  activeTrackingTaskId,
  onToggleTracking,
  onPostpone,
}: PriorityColumnProps) => {
  const columnToneClass = `priority-column-${priority}`;
  const { setNodeRef, isOver } = useDroppable({
    id: priorityColumnId(priority),
    data: {
      type: 'priority-column',
      priority,
    },
  });

  return (
    <section className={`board-column ${columnToneClass}`}>
      <header className="board-column__header">
        <h3>{title}</h3>
        <span className="priority-column__count">{tasks.length}</span>
      </header>

      <div ref={setNodeRef} className={`board-column__content ${isOver ? 'board-column__content-over' : ''}`}>
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => {
            const taskSubtasks = subtasksByTaskId.get(task.id) ?? [];
            const subtaskDone = taskSubtasks.filter((subtask) => subtask.done).length;

            return (
              <TaskCard
                key={task.id}
                task={task}
                project={task.projectId ? projectsById.get(task.projectId) : undefined}
                taskSubtasks={taskSubtasks}
                subtaskTotal={taskSubtasks.length}
                subtaskDone={subtaskDone}
                onEdit={onEditTask}
                onOpenDetail={onOpenTaskDetail}
                onDelete={onDeleteTask}
                onStatusChange={onStatusChange}
                onSubtaskDoneChange={onSubtaskDoneChange}
                isTracking={activeTrackingTaskId === task.id}
                onToggleTracking={onToggleTracking}
                onPostpone={onPostpone}
              />
            );
          })}
        </SortableContext>
      </div>
    </section>
  );
};

export const PriorityBoard = ({
  tasks,
  projectsById,
  subtasksByTaskId,
  onOpenTaskDetail,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onSubtaskDoneChange,
  activeTrackingTaskId,
  onToggleTracking,
  onPostpone,
  onPriorityChange,
  onReorderWithinPriority,
}: PriorityBoardProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const tasksByPriority = useMemo(() => {
    return {
      high: tasks.filter((task) => task.priority === 'high').sort(sortByUpdatedAtDesc),
      medium: tasks.filter((task) => task.priority === 'medium').sort(sortByUpdatedAtDesc),
      low: tasks.filter((task) => task.priority === 'low').sort(sortByUpdatedAtDesc),
    };
  }, [tasks]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) {
      return;
    }

    const taskId = String(active.id);
    const sourceTask = tasks.find((task) => task.id === taskId);
    if (!sourceTask) {
      return;
    }

    const overId = String(over.id);
    let targetPriority: Priority | null = null;

    if (overId.startsWith('priority-column-')) {
      targetPriority = overId.replace('priority-column-', '') as Priority;
    } else {
      const targetTask = tasks.find((task) => task.id === overId);
      targetPriority = targetTask?.priority ?? null;
    }

    if (!targetPriority) {
      return;
    }

    if (targetPriority === sourceTask.priority) {
      const laneTasks = tasksByPriority[sourceTask.priority];
      const laneTaskIds = laneTasks.map((task) => task.id);

      if (overId.startsWith('priority-column-')) {
        if (!laneTaskIds.includes(taskId)) {
          return;
        }

        const reorderedTaskIds = laneTaskIds.filter((currentId) => currentId !== taskId);
        reorderedTaskIds.push(taskId);

        const alreadyAtEnd = laneTaskIds[laneTaskIds.length - 1] === taskId;
        if (alreadyAtEnd) {
          return;
        }

        onReorderWithinPriority(sourceTask.priority, reorderedTaskIds);
        return;
      }

      const activeIndex = laneTasks.findIndex((task) => task.id === taskId);
      const overIndex = laneTasks.findIndex((task) => task.id === overId);

      if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
        return;
      }

      const reorderedTaskIds = arrayMove(
        laneTasks.map((task) => task.id),
        activeIndex,
        overIndex,
      );
      onReorderWithinPriority(sourceTask.priority, reorderedTaskIds);
      return;
    }

    onPriorityChange(taskId, targetPriority);
  };

  return (
    <section className="priority-board">
      <header className="priority-board__header">
        <h3>
          <span className="title-with-icon">
            <Layers3 size={13} aria-hidden="true" />
            Priorización de tareas
          </span>
        </h3>
        <span>{tasks.length}</span>
      </header>

      {tasks.length === 0 ? (
        <p className="priority-board__empty">No hay tareas activas para los filtros actuales.</p>
      ) : (
        <div className="board-scroll">
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="board-grid">
              {priorityColumns.map((column) => (
                <PriorityColumn
                  key={column.priority}
                  priority={column.priority}
                  title={column.title}
                  tasks={tasksByPriority[column.priority]}
                  projectsById={projectsById}
                  subtasksByTaskId={subtasksByTaskId}
                  onOpenTaskDetail={onOpenTaskDetail}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                  onStatusChange={onStatusChange}
                  onSubtaskDoneChange={onSubtaskDoneChange}
                  activeTrackingTaskId={activeTrackingTaskId}
                  onToggleTracking={onToggleTracking}
                  onPostpone={onPostpone}
                />
              ))}
            </div>
          </DndContext>
        </div>
      )}
    </section>
  );
};
