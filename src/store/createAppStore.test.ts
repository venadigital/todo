import { describe, expect, it } from 'vitest';
import { postponeDate } from '../lib/dates';
import type { AppStateV1 } from '../types';
import { createAppStore } from './createAppStore';

const emptyState = (): AppStateV1 => ({
  version: 1,
  projects: [],
  tasks: [],
  subtasks: [],
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
});
