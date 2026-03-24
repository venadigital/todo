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
const priorities: Priority[] = ['high', 'medium', 'low'];

const sortByUpdatedAtDesc = (a: Task, b: Task) =>
  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

const isPriority = (value: unknown): value is Priority =>
  typeof value === 'string' && priorities.includes(value as Priority);

const getPriorityFromColumnId = (value: unknown): Priority | null => {
  if (typeof value !== 'string' || !value.startsWith('priority-column-')) {
    return null;
  }

  const parsed = value.replace('priority-column-', '');
  return isPriority(parsed) ? parsed : null;
};

const resolveTargetPriority = (over: DragEndEvent['over'], tasksById: Map<string, Task>): Priority | null => {
  if (!over) {
    return null;
  }

  const overData = over.data.current as
    | {
        priority?: unknown;
        sortable?: {
          containerId?: unknown;
        };
      }
    | undefined;

  if (isPriority(overData?.priority)) {
    return overData.priority;
  }

  const overId = String(over.id);
  const taskByOverId = tasksById.get(overId);
  if (taskByOverId) {
    return taskByOverId.priority;
  }

  const fromContainerId = getPriorityFromColumnId(overData?.sortable?.containerId);
  if (fromContainerId) {
    return fromContainerId;
  }

  return getPriorityFromColumnId(overId);
};

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
    const tasksById = new Map(tasks.map((task) => [task.id, task]));
    const sourceTask = tasksById.get(taskId);
    if (!sourceTask) {
      return;
    }

    const overId = String(over.id);
    const targetPriority = resolveTargetPriority(over, tasksById);

    if (!targetPriority) {
      return;
    }

    if (targetPriority === sourceTask.priority) {
      const laneTasks = tasksByPriority[sourceTask.priority];
      const laneTaskIds = laneTasks.map((task) => task.id);
      const activeIndex = laneTasks.findIndex((task) => task.id === taskId);
      if (activeIndex < 0) {
        return;
      }

      const overTask = tasksById.get(overId);
      const droppedOnColumn = getPriorityFromColumnId(overId) === sourceTask.priority;
      const droppedOnSameLaneTask = overTask?.priority === sourceTask.priority;
      const fallbackIndex = laneTaskIds.length - 1;
      const overIndex = droppedOnSameLaneTask ? laneTasks.findIndex((task) => task.id === overId) : fallbackIndex;

      if (overIndex < 0 || activeIndex === overIndex) {
        return;
      }

      const reorderedTaskIds = arrayMove(laneTaskIds, activeIndex, overIndex);
      const unchanged = reorderedTaskIds.every((id, index) => id === laneTaskIds[index]);
      if (unchanged) {
        return;
      }

      if (!droppedOnColumn && !droppedOnSameLaneTask && activeIndex === fallbackIndex) {
        return;
      }

      onReorderWithinPriority(sourceTask.priority, reorderedTaskIds);
      return;
    }

    const destinationLaneIds = tasksByPriority[targetPriority]
      .map((task) => task.id)
      .filter((id) => id !== taskId);
    const targetTask = tasksById.get(overId);
    const dropOnTargetTask = targetTask?.priority === targetPriority;
    const insertAt = dropOnTargetTask ? destinationLaneIds.indexOf(overId) : destinationLaneIds.length;
    const safeInsertIndex = insertAt < 0 ? destinationLaneIds.length : insertAt;

    const nextDestinationOrder = [...destinationLaneIds];
    nextDestinationOrder.splice(safeInsertIndex, 0, taskId);

    onPriorityChange(taskId, targetPriority);
    onReorderWithinPriority(targetPriority, nextDestinationOrder);
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
