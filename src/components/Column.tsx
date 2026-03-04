import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { TaskCard } from './TaskCard';
import type { Project, Subtask, Task, TaskStatus } from '../types';

interface ColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  projectsById: Map<string, Project>;
  subtasksByTaskId: Map<string, Subtask[]>;
  onEditTask: (taskId: string) => void;
  onOpenTaskDetail: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSubtaskDoneChange: (subtaskId: string, done: boolean) => void;
  activeTrackingTaskId: string | null;
  onToggleTracking: (taskId: string) => void;
  onPostpone: (taskId: string, days: number) => void;
}

export const Column = ({
  status,
  title,
  tasks,
  projectsById,
  subtasksByTaskId,
  onEditTask,
  onOpenTaskDetail,
  onDeleteTask,
  onStatusChange,
  onSubtaskDoneChange,
  activeTrackingTaskId,
  onToggleTracking,
  onPostpone,
}: ColumnProps) => {
  const droppableId = `column-${status}`;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: {
      type: 'column',
      status,
    },
  });

  return (
    <section className="board-column">
      <header className="board-column__header">
        <h3>{title}</h3>
        <span>{tasks.length}</span>
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
