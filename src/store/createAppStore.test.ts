import { describe, expect, it } from 'vitest';
import { postponeDate } from '../lib/dates';
import type { AppStateV1 } from '../types';
import { createAppStore } from './createAppStore';

const emptyState = (): AppStateV1 => ({
  version: 1,
  projects: [],
  tasks: [],
  subtasks: [],
  notes: [],
  quickTasks: [],
  filters: {
    query: '',
    projectId: 'all',
    status: 'all',
    due: 'all',
  },
  timeSessions: [],
  activeTracking: null,
});

describe('createAppStore', () => {
  it('crea, edita y borra tarea', () => {
    const store = createAppStore(emptyState());
    const { actions } = store.getState();

    const taskId = actions.saveTask({
      title: 'Implementar tablero',
      description: 'Tarea inicial',
      projectId: null,
      status: 'pending',
      progress: 0,
      priority: 'medium',
      dueDate: null,
      subtasks: [],
    });

    expect(store.getState().tasks).toHaveLength(1);

    actions.saveTask({
      id: taskId,
      title: 'Implementar tablero v2',
      description: 'Actualizada',
      projectId: null,
      status: 'pending',
      progress: 50,
      priority: 'high',
      dueDate: null,
      subtasks: [],
    });

    const edited = store.getState().tasks[0];
    expect(edited.title).toBe('Implementar tablero v2');
    expect(edited.status).toBe('in_progress');
    expect(edited.progress).toBe(50);

    actions.deleteTask(taskId);
    expect(store.getState().tasks).toHaveLength(0);
  });

  it('sincroniza cierre automático por subtareas y reapertura', () => {
    const store = createAppStore(emptyState());
    const { actions } = store.getState();

    const taskId = actions.saveTask({
      title: 'Flujo subtareas',
      description: '',
      projectId: null,
      status: 'pending',
      progress: 0,
      priority: 'medium',
      dueDate: null,
      subtasks: [
        { title: 'Sub A', done: false },
        { title: 'Sub B', done: false },
      ],
    });

    let task = store.getState().tasks[0];
    expect(task.status).toBe('pending');
    expect(task.progress).toBe(0);

    actions.saveTask({
      id: taskId,
      title: 'Flujo subtareas',
      description: '',
      projectId: null,
      status: 'in_progress',
      progress: 20,
      priority: 'medium',
      dueDate: null,
      subtasks: [
        { id: store.getState().subtasks[0].id, title: 'Sub A', done: true },
        { id: store.getState().subtasks[1].id, title: 'Sub B', done: true },
      ],
    });

    task = store.getState().tasks[0];
    expect(task.status).toBe('done');
    expect(task.progress).toBe(100);

    actions.saveTask({
      id: taskId,
      title: 'Flujo subtareas',
      description: '',
      projectId: null,
      status: 'done',
      progress: 100,
      priority: 'medium',
      dueDate: null,
      subtasks: [
        { id: store.getState().subtasks[0].id, title: 'Sub A', done: true },
        { id: store.getState().subtasks[1].id, title: 'Sub B', done: false },
      ],
    });

    task = store.getState().tasks[0];
    expect(task.status).toBe('in_progress');
    expect(task.progress).toBe(50);
  });

  it('borra proyecto en cascada con tareas y subtareas', () => {
    const store = createAppStore(emptyState());
    const { actions } = store.getState();

    const projectId = actions.createProject({ name: 'Core', color: '#22c55e' });

    actions.saveTask({
      title: 'Task en proyecto',
      description: '',
      projectId,
      status: 'pending',
      progress: 0,
      priority: 'medium',
      dueDate: null,
      subtasks: [{ title: 'Sub', done: false }],
    });

    expect(store.getState().projects).toHaveLength(1);
    expect(store.getState().tasks).toHaveLength(1);
    expect(store.getState().subtasks).toHaveLength(1);

    actions.deleteProject(projectId);

    expect(store.getState().projects).toHaveLength(0);
    expect(store.getState().tasks).toHaveLength(0);
    expect(store.getState().subtasks).toHaveLength(0);
  });

  it('pospone tarea con o sin fecha', () => {
    const store = createAppStore(emptyState());
    const { actions } = store.getState();

    const taskId = actions.saveTask({
      title: 'Posponer',
      description: '',
      projectId: null,
      status: 'pending',
      progress: 0,
      priority: 'medium',
      dueDate: null,
      subtasks: [],
    });

    actions.postponeTask(taskId, 3);
    const firstDue = store.getState().tasks[0].dueDate;
    expect(firstDue).toBe(postponeDate(null, 3));
    expect(store.getState().tasks[0].postponedCount).toBe(1);

    actions.postponeTask(taskId, 1);
    expect(store.getState().tasks[0].dueDate).toBe(postponeDate(firstDue, 1));
    expect(store.getState().tasks[0].postponedCount).toBe(2);
  });

  it('sincroniza estado y progreso manual sin subtareas', () => {
    const store = createAppStore(emptyState());
    const { actions } = store.getState();

    const taskId = actions.saveTask({
      title: 'Sync estado',
      description: '',
      projectId: null,
      status: 'pending',
      progress: 0,
      priority: 'medium',
      dueDate: null,
      subtasks: [],
    });

    actions.setTaskStatus(taskId, 'done');
    let task = store.getState().tasks[0];
    expect(task.progress).toBe(100);
    expect(task.status).toBe('done');

    actions.setTaskProgress(taskId, 0);
    task = store.getState().tasks[0];
    expect(task.status).toBe('pending');

    actions.setTaskProgress(taskId, 100);
    task = store.getState().tasks[0];
    expect(task.status).toBe('done');
  });

  it('cambia prioridad sin afectar estado ni avance', () => {
    const store = createAppStore(emptyState());
    const { actions } = store.getState();

    const taskId = actions.saveTask({
      title: 'Priorizar pipeline',
      description: '',
      projectId: null,
      status: 'in_progress',
      progress: 45,
      priority: 'low',
      dueDate: null,
      subtasks: [],
    });

    const before = store.getState().tasks[0];
    actions.setTaskPriority(taskId, 'high');
    const after = store.getState().tasks[0];

    expect(after.priority).toBe('high');
    expect(after.status).toBe(before.status);
    expect(after.progress).toBe(before.progress);
    expect(after.dueDate).toBe(before.dueDate);
    expect(new Date(after.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(before.updatedAt).getTime(),
    );
  });

  it('reordena tareas dentro de una misma prioridad', () => {
    const store = createAppStore(emptyState());
    const { actions } = store.getState();

    const firstTaskId = actions.saveTask({
      title: 'Task A',
      description: '',
      projectId: null,
      status: 'pending',
      progress: 0,
      priority: 'high',
      dueDate: null,
      subtasks: [],
    });
    const secondTaskId = actions.saveTask({
      title: 'Task B',
      description: '',
      projectId: null,
      status: 'pending',
      progress: 0,
      priority: 'high',
      dueDate: null,
      subtasks: [],
    });
    const thirdTaskId = actions.saveTask({
      title: 'Task C',
      description: '',
      projectId: null,
      status: 'pending',
      progress: 0,
      priority: 'high',
      dueDate: null,
      subtasks: [],
    });

    actions.reorderTasksWithinPriority('high', [thirdTaskId, firstTaskId, secondTaskId]);

    const ordered = store
      .getState()
      .tasks
      .filter((task) => task.priority === 'high')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((task) => task.id);

    expect(ordered).toEqual([thirdTaskId, firstTaskId, secondTaskId]);
  });

  it('al reordenar parcial mantiene tareas no visibles al final', () => {
    const store = createAppStore(emptyState());
    const { actions } = store.getState();

    const firstTaskId = actions.saveTask({
      title: 'Task Visible A',
      description: '',
      projectId: null,
      status: 'pending',
      progress: 0,
      priority: 'high',
      dueDate: null,
      subtasks: [],
    });
    const secondTaskId = actions.saveTask({
      title: 'Task Visible B',
      description: '',
      projectId: null,
      status: 'pending',
      progress: 0,
      priority: 'high',
      dueDate: null,
      subtasks: [],
    });
    const hiddenTaskId = actions.saveTask({
      title: 'Task Oculta',
      description: '',
      projectId: null,
      status: 'pending',
      progress: 0,
      priority: 'high',
      dueDate: null,
      subtasks: [],
    });

    actions.reorderTasksWithinPriority('high', [secondTaskId, firstTaskId]);

    const ordered = store
      .getState()
      .tasks
      .filter((task) => task.priority === 'high')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((task) => task.id);

    expect(ordered).toEqual([secondTaskId, firstTaskId, hiddenTaskId]);
  });

  it('al reordenar con un solo id visible lo deja primero y conserva ocultas al final', () => {
    const store = createAppStore(emptyState());
    const { actions } = store.getState();

    const hiddenTaskA = actions.saveTask({
      title: 'Task Oculta A',
      description: '',
      projectId: null,
      status: 'pending',
      progress: 0,
      priority: 'medium',
      dueDate: null,
      subtasks: [],
    });
    const visibleTaskId = actions.saveTask({
      title: 'Task Visible',
      description: '',
      projectId: null,
      status: 'pending',
      progress: 0,
      priority: 'medium',
      dueDate: null,
      subtasks: [],
    });
    const hiddenTaskB = actions.saveTask({
      title: 'Task Oculta B',
      description: '',
      projectId: null,
      status: 'pending',
      progress: 0,
      priority: 'medium',
      dueDate: null,
      subtasks: [],
    });

    actions.reorderTasksWithinPriority('medium', [visibleTaskId]);

    const ordered = store
      .getState()
      .tasks
      .filter((task) => task.priority === 'medium')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((task) => task.id);

    expect(ordered[0]).toBe(visibleTaskId);
    expect(ordered).toContain(hiddenTaskA);
    expect(ordered).toContain(hiddenTaskB);
  });

  it('actualiza subtareas desde el tablero y recalcula avance/estado', () => {
    const store = createAppStore(emptyState());
    const { actions } = store.getState();

    actions.saveTask({
      title: 'Checklist UI',
      description: '',
      projectId: null,
      status: 'pending',
      progress: 0,
      priority: 'medium',
      dueDate: null,
      subtasks: [
        { title: 'Header', done: false },
        { title: 'Board', done: false },
      ],
    });

    const [firstSubtaskId, secondSubtaskId] = store.getState().subtasks.map((subtask) => subtask.id);

    actions.setSubtaskDone(firstSubtaskId, true);
    let task = store.getState().tasks[0];
    expect(task.status).toBe('in_progress');
    expect(task.progress).toBe(50);

    actions.setSubtaskDone(secondSubtaskId, true);
    task = store.getState().tasks[0];
    expect(task.status).toBe('done');
    expect(task.progress).toBe(100);

    actions.setSubtaskDone(firstSubtaskId, false);
    task = store.getState().tasks[0];
    expect(task.status).toBe('in_progress');
    expect(task.progress).toBe(50);
  });

  it('permite CRUD de subtareas desde el detalle de tarea', () => {
    const store = createAppStore(emptyState());
    const { actions } = store.getState();

    const taskId = actions.saveTask({
      title: 'Detalle tarea',
      description: 'Con subtareas editables',
      projectId: null,
      status: 'pending',
      progress: 0,
      priority: 'medium',
      dueDate: null,
      subtasks: [],
    });

    actions.addSubtask(taskId, 'Sub inicial');
    expect(store.getState().subtasks).toHaveLength(1);
    expect(store.getState().subtasks[0].title).toBe('Sub inicial');

    const subtaskId = store.getState().subtasks[0].id;
    actions.updateSubtask(subtaskId, { title: 'Sub actualizada' });
    expect(store.getState().subtasks[0].title).toBe('Sub actualizada');

    actions.updateSubtask(subtaskId, { done: true });
    let task = store.getState().tasks[0];
    expect(task.status).toBe('done');
    expect(task.progress).toBe(100);

    actions.deleteSubtask(subtaskId);
    expect(store.getState().subtasks).toHaveLength(0);
    task = store.getState().tasks[0];
    expect(task.status).toBe('done');
    expect(task.progress).toBe(100);
  });

  it('permite reordenar subtareas manualmente dentro de la misma tarea', () => {
    const store = createAppStore(emptyState());
    const { actions } = store.getState();

    const taskId = actions.saveTask({
      title: 'Orden subtareas',
      description: '',
      projectId: null,
      status: 'pending',
      progress: 0,
      priority: 'medium',
      dueDate: null,
      subtasks: [
        { title: 'Primera', done: false },
        { title: 'Segunda', done: false },
        { title: 'Tercera', done: false },
      ],
    });

    const initial = store
      .getState()
      .subtasks.filter((subtask) => subtask.taskId === taskId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((subtask) => subtask.id);

    actions.reorderSubtasks(taskId, [initial[2], initial[0], initial[1]]);

    const reordered = store
      .getState()
      .subtasks.filter((subtask) => subtask.taskId === taskId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((subtask) => subtask.id);

    expect(reordered).toEqual([initial[2], initial[0], initial[1]]);
  });

  it('registra sesiones de tiempo al iniciar y detener seguimiento', () => {
    const store = createAppStore(emptyState());
    const { actions } = store.getState();

    const taskId = actions.saveTask({
      title: 'Control tiempo',
      description: '',
      projectId: null,
      status: 'pending',
      progress: 0,
      priority: 'medium',
      dueDate: null,
      subtasks: [],
    });

    actions.startTracking(taskId);
    expect(store.getState().activeTracking?.taskId).toBe(taskId);

    actions.stopTracking();
    expect(store.getState().activeTracking).toBeNull();
    expect(store.getState().timeSessions).toHaveLength(1);
    expect(store.getState().timeSessions[0].taskId).toBe(taskId);
  });

  it('cambia tracking entre tareas con cierre automático de sesión previa', () => {
    const store = createAppStore(emptyState());
    const { actions } = store.getState();

    const taskA = actions.saveTask({
      title: 'Task A',
      description: '',
      projectId: null,
      status: 'pending',
      progress: 0,
      priority: 'medium',
      dueDate: null,
      subtasks: [],
    });

    const taskB = actions.saveTask({
      title: 'Task B',
      description: '',
      projectId: null,
      status: 'pending',
      progress: 0,
      priority: 'medium',
      dueDate: null,
      subtasks: [],
    });

    actions.startTracking(taskA);
    actions.startTracking(taskB);

    expect(store.getState().activeTracking?.taskId).toBe(taskB);
    expect(store.getState().timeSessions).toHaveLength(1);
    expect(store.getState().timeSessions[0].taskId).toBe(taskA);

    actions.toggleTracking(taskB);
    expect(store.getState().activeTracking).toBeNull();
    expect(store.getState().timeSessions).toHaveLength(2);
  });

  it('gestiona lista rapida de prioridades', () => {
    const store = createAppStore(emptyState());
    const { actions } = store.getState();

    const firstId = actions.createQuickTask('Urgente A');
    const secondId = actions.createQuickTask('Urgente B');

    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();
    expect(store.getState().quickTasks).toHaveLength(2);

    if (!firstId || !secondId) {
      throw new Error('No se crearon quick tasks');
    }

    actions.toggleQuickTask(firstId);
    expect(store.getState().quickTasks.find((quickTask) => quickTask.id === firstId)?.done).toBe(true);

    actions.clearDoneQuickTasks();
    expect(store.getState().quickTasks).toHaveLength(1);
    expect(store.getState().quickTasks[0].id).toBe(secondId);

    actions.deleteQuickTask(secondId);
    expect(store.getState().quickTasks).toHaveLength(0);
  });

  it('convierte una prioridad rapida en tarea asignada a proyecto', () => {
    const store = createAppStore(emptyState());
    const { actions } = store.getState();

    const projectId = actions.createProject({ name: 'Marketing', color: '#22c55e' });
    const quickTaskId = actions.createQuickTask('Grabar reel urgente');

    if (!quickTaskId) {
      throw new Error('No se creo quick task');
    }

    const createdTaskId = actions.promoteQuickTaskToTask(quickTaskId, projectId);
    expect(createdTaskId).toBeTruthy();
    expect(store.getState().quickTasks).toHaveLength(0);
    expect(store.getState().tasks).toHaveLength(1);

    const createdTask = store.getState().tasks[0];
    expect(createdTask.title).toBe('Grabar reel urgente');
    expect(createdTask.projectId).toBe(projectId);
    expect(createdTask.status).toBe('pending');
    expect(createdTask.progress).toBe(0);
    expect(createdTask.priority).toBe('high');
  });

  it('gestiona notas globales con color y fijado', () => {
    const store = createAppStore(emptyState());
    const { actions } = store.getState();

    const noteId = actions.createNote({
      title: 'Idea principal',
      content: 'Validar propuesta con equipo',
      color: 'violet',
    });

    expect(noteId).toBeTruthy();
    expect(store.getState().notes).toHaveLength(1);
    expect(store.getState().notes[0].color).toBe('violet');
    expect(store.getState().notes[0].pinned).toBe(false);

    actions.updateNote(noteId, {
      title: 'Idea validada',
      content: 'Crear tareas del sprint',
      color: 'amber',
    });

    const updatedNote = store.getState().notes[0];
    expect(updatedNote.title).toBe('Idea validada');
    expect(updatedNote.content).toBe('Crear tareas del sprint');
    expect(updatedNote.color).toBe('amber');

    actions.toggleNotePinned(noteId);
    expect(store.getState().notes[0].pinned).toBe(true);

    actions.deleteNote(noteId);
    expect(store.getState().notes).toHaveLength(0);
  });
});
