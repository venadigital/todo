import express from 'express';
import mysql from 'mysql2/promise';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 8787);
const STORAGE_DRIVER = (process.env.STORAGE_DRIVER ?? '').toLowerCase();
const DATA_FILE = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.resolve(process.env.TMPDIR ?? '/tmp', 'todo-board-state.json');

const DB_HOST = process.env.DB_HOST ?? '';
const DB_PORT = Number(process.env.DB_PORT ?? 3306);
const DB_USER = process.env.DB_USER ?? '';
const DB_PASSWORD = process.env.DB_PASSWORD ?? '';
const DB_NAME = process.env.DB_NAME ?? '';
const DB_SSL_ENABLED = process.env.DB_SSL === 'true';
const DB_POOL_SIZE = Number(process.env.DB_POOL_SIZE ?? 8);

const shouldUseMySql =
  STORAGE_DRIVER === 'mysql' ||
  (STORAGE_DRIVER !== 'file' && Boolean(DB_HOST && DB_USER && DB_NAME));

const DEFAULT_FILTERS = {
  query: '',
  projectId: 'all',
  status: 'all',
  due: 'all',
};

const defaultState = {
  version: 1,
  projects: [],
  tasks: [],
  subtasks: [],
  quickTasks: [],
  filters: DEFAULT_FILTERS,
  timeSessions: [],
  activeTracking: null,
};

const isObject = (value) => typeof value === 'object' && value !== null;
const isTaskStatus = (value) => value === 'pending' || value === 'in_progress' || value === 'done';
const isPriority = (value) => value === 'low' || value === 'medium' || value === 'high';
const isDueFilter = (value) =>
  value === 'all' || value === 'overdue' || value === 'today' || value === 'this_week' || value === 'no_date';

const isStateShape = (raw) => {
  if (!isObject(raw) || raw.version !== 1) {
    return false;
  }

  if (
    !Array.isArray(raw.projects) ||
    !Array.isArray(raw.tasks) ||
    !Array.isArray(raw.subtasks) ||
    !Array.isArray(raw.timeSessions) ||
    !isObject(raw.filters)
  ) {
    return false;
  }

  if (
    typeof raw.filters.query !== 'string' ||
    typeof raw.filters.projectId !== 'string' ||
    !(raw.filters.status === 'all' || isTaskStatus(raw.filters.status)) ||
    !isDueFilter(raw.filters.due)
  ) {
    return false;
  }

  const projectsValid = raw.projects.every(
    (project) =>
      isObject(project) &&
      typeof project.id === 'string' &&
      typeof project.name === 'string' &&
      typeof project.color === 'string' &&
      typeof project.createdAt === 'string' &&
      typeof project.updatedAt === 'string',
  );

  if (!projectsValid) {
    return false;
  }

  const tasksValid = raw.tasks.every(
    (task) =>
      isObject(task) &&
      typeof task.id === 'string' &&
      typeof task.title === 'string' &&
      typeof task.description === 'string' &&
      (task.projectId === null || typeof task.projectId === 'string') &&
      isTaskStatus(task.status) &&
      typeof task.progress === 'number' &&
      isPriority(task.priority) &&
      (task.dueDate === null || typeof task.dueDate === 'string') &&
      typeof task.postponedCount === 'number' &&
      typeof task.createdAt === 'string' &&
      typeof task.updatedAt === 'string',
  );

  if (!tasksValid) {
    return false;
  }

  const subtasksValid = raw.subtasks.every(
    (subtask) =>
      isObject(subtask) &&
      typeof subtask.id === 'string' &&
      typeof subtask.taskId === 'string' &&
      typeof subtask.title === 'string' &&
      typeof subtask.done === 'boolean' &&
      typeof subtask.createdAt === 'string' &&
      typeof subtask.updatedAt === 'string',
  );

  if (!subtasksValid) {
    return false;
  }

  if (
    raw.quickTasks !== undefined &&
    (!Array.isArray(raw.quickTasks) ||
      raw.quickTasks.some(
        (quickTask) =>
          !isObject(quickTask) ||
          typeof quickTask.id !== 'string' ||
          typeof quickTask.title !== 'string' ||
          typeof quickTask.done !== 'boolean' ||
          typeof quickTask.createdAt !== 'string' ||
          typeof quickTask.updatedAt !== 'string',
      ))
  ) {
    return false;
  }

  const sessionsValid = raw.timeSessions.every(
    (session) =>
      isObject(session) &&
      typeof session.id === 'string' &&
      typeof session.taskId === 'string' &&
      typeof session.startAt === 'string' &&
      typeof session.endAt === 'string',
  );

  if (!sessionsValid) {
    return false;
  }

  if (raw.activeTracking === null) {
    return true;
  }

  return (
    isObject(raw.activeTracking) &&
    typeof raw.activeTracking.taskId === 'string' &&
    typeof raw.activeTracking.startAt === 'string'
  );
};

const createFileStore = async () => {
  const dir = path.dirname(DATA_FILE);
  await mkdir(dir, { recursive: true });

  if (!existsSync(DATA_FILE)) {
    await writeFile(DATA_FILE, JSON.stringify(defaultState, null, 2), 'utf-8');
  }

  return {
    kind: 'file',
    read: async () => {
      try {
        const raw = await readFile(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return isStateShape(parsed) ? parsed : defaultState;
      } catch {
        return defaultState;
      }
    },
    write: async (state) => {
      await writeFile(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
    },
    close: async () => undefined,
  };
};

const createMemoryStore = () => {
  let snapshot = JSON.parse(JSON.stringify(defaultState));

  return {
    kind: 'memory',
    read: async () => snapshot,
    write: async (state) => {
      snapshot = JSON.parse(JSON.stringify(state));
    },
    close: async () => undefined,
  };
};

const chunk = (items, size) => {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
};

const insertMany = async (connection, table, columns, rows) => {
  if (rows.length === 0) {
    return;
  }

  for (const batch of chunk(rows, 200)) {
    const placeholders = batch
      .map(() => `(${columns.map(() => '?').join(',')})`)
      .join(',');
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders}`;
    const values = batch.flat();
    await connection.query(sql, values);
  }
};

const ensureMySqlSchema = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS board_state (
      id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
      version INT NOT NULL,
      filter_query TEXT NOT NULL,
      filter_project_id VARCHAR(128) NOT NULL,
      filter_status VARCHAR(24) NOT NULL,
      filter_due VARCHAR(24) NOT NULL,
      active_tracking_task_id VARCHAR(128) NULL,
      active_tracking_start_at VARCHAR(40) NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(128) NOT NULL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      color VARCHAR(24) NOT NULL,
      created_at VARCHAR(40) NOT NULL,
      updated_at VARCHAR(40) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id VARCHAR(128) NOT NULL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      project_id VARCHAR(128) NULL,
      status VARCHAR(24) NOT NULL,
      progress INT NOT NULL,
      priority VARCHAR(24) NOT NULL,
      due_date VARCHAR(40) NULL,
      postponed_count INT NOT NULL,
      created_at VARCHAR(40) NOT NULL,
      updated_at VARCHAR(40) NOT NULL,
      INDEX idx_tasks_project_id (project_id),
      INDEX idx_tasks_status (status),
      INDEX idx_tasks_due_date (due_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id VARCHAR(128) NOT NULL PRIMARY KEY,
      task_id VARCHAR(128) NOT NULL,
      title VARCHAR(255) NOT NULL,
      done TINYINT(1) NOT NULL,
      created_at VARCHAR(40) NOT NULL,
      updated_at VARCHAR(40) NOT NULL,
      INDEX idx_subtasks_task_id (task_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS time_sessions (
      id VARCHAR(128) NOT NULL PRIMARY KEY,
      task_id VARCHAR(128) NOT NULL,
      start_at VARCHAR(40) NOT NULL,
      end_at VARCHAR(40) NOT NULL,
      INDEX idx_time_sessions_task_id (task_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quick_tasks (
      id VARCHAR(128) NOT NULL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      done TINYINT(1) NOT NULL,
      created_at VARCHAR(40) NOT NULL,
      updated_at VARCHAR(40) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(
    `
      INSERT INTO board_state (
        id,
        version,
        filter_query,
        filter_project_id,
        filter_status,
        filter_due,
        active_tracking_task_id,
        active_tracking_start_at
      )
      VALUES (1, 1, '', 'all', 'all', 'all', NULL, NULL)
      ON DUPLICATE KEY UPDATE id = id
    `,
  );
};

const createMySqlStore = async () => {
  const pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: DB_POOL_SIZE,
    charset: 'utf8mb4',
    ssl: DB_SSL_ENABLED ? { rejectUnauthorized: false } : undefined,
  });

  await pool.query('SELECT 1');
  await ensureMySqlSchema(pool);

  return {
    kind: 'mysql',
    read: async () => {
      const [metaRows] = await pool.query(
        `
          SELECT
            version,
            filter_query,
            filter_project_id,
            filter_status,
            filter_due,
            active_tracking_task_id,
            active_tracking_start_at
          FROM board_state
          WHERE id = 1
          LIMIT 1
        `,
      );

      const [projectRows] = await pool.query(
        'SELECT id, name, color, created_at AS createdAt, updated_at AS updatedAt FROM projects',
      );

      const [taskRows] = await pool.query(
        `
          SELECT
            id,
            title,
            description,
            project_id AS projectId,
            status,
            progress,
            priority,
            due_date AS dueDate,
            postponed_count AS postponedCount,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM tasks
        `,
      );

      const [subtaskRows] = await pool.query(
        `
          SELECT
            id,
            task_id AS taskId,
            title,
            done,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM subtasks
        `,
      );

      const [timeSessionRows] = await pool.query(
        `
          SELECT
            id,
            task_id AS taskId,
            start_at AS startAt,
            end_at AS endAt
          FROM time_sessions
        `,
      );

      const [quickTaskRows] = await pool.query(
        `
          SELECT
            id,
            title,
            done,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM quick_tasks
        `,
      );

      const meta = metaRows[0] ?? {
        version: 1,
        filter_query: '',
        filter_project_id: 'all',
        filter_status: 'all',
        filter_due: 'all',
        active_tracking_task_id: null,
        active_tracking_start_at: null,
      };

      const parsedState = {
        version: Number(meta.version) === 1 ? 1 : 1,
        projects: projectRows,
        tasks: taskRows.map((task) => ({
          ...task,
          projectId: task.projectId ?? null,
          progress: Number(task.progress),
          postponedCount: Number(task.postponedCount),
        })),
        subtasks: subtaskRows.map((subtask) => ({
          ...subtask,
          done: Boolean(subtask.done),
        })),
        quickTasks: quickTaskRows.map((quickTask) => ({
          ...quickTask,
          done: Boolean(quickTask.done),
        })),
        filters: {
          query: String(meta.filter_query ?? ''),
          projectId: String(meta.filter_project_id ?? 'all'),
          status: String(meta.filter_status ?? 'all'),
          due: String(meta.filter_due ?? 'all'),
        },
        timeSessions: timeSessionRows,
        activeTracking:
          meta.active_tracking_task_id && meta.active_tracking_start_at
            ? {
                taskId: String(meta.active_tracking_task_id),
                startAt: String(meta.active_tracking_start_at),
              }
            : null,
      };

      return isStateShape(parsedState) ? parsedState : defaultState;
    },
    write: async (state) => {
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        await connection.query(
          `
            INSERT INTO board_state (
              id,
              version,
              filter_query,
              filter_project_id,
              filter_status,
              filter_due,
              active_tracking_task_id,
              active_tracking_start_at
            )
            VALUES (1, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              version = VALUES(version),
              filter_query = VALUES(filter_query),
              filter_project_id = VALUES(filter_project_id),
              filter_status = VALUES(filter_status),
              filter_due = VALUES(filter_due),
              active_tracking_task_id = VALUES(active_tracking_task_id),
              active_tracking_start_at = VALUES(active_tracking_start_at)
          `,
          [
            state.version,
            state.filters.query,
            state.filters.projectId,
            state.filters.status,
            state.filters.due,
            state.activeTracking?.taskId ?? null,
            state.activeTracking?.startAt ?? null,
          ],
        );

        await connection.query('DELETE FROM subtasks');
        await connection.query('DELETE FROM quick_tasks');
        await connection.query('DELETE FROM time_sessions');
        await connection.query('DELETE FROM tasks');
        await connection.query('DELETE FROM projects');

        await insertMany(
          connection,
          'projects',
          ['id', 'name', 'color', 'created_at', 'updated_at'],
          state.projects.map((project) => [
            project.id,
            project.name,
            project.color,
            project.createdAt,
            project.updatedAt,
          ]),
        );

        await insertMany(
          connection,
          'tasks',
          [
            'id',
            'title',
            'description',
            'project_id',
            'status',
            'progress',
            'priority',
            'due_date',
            'postponed_count',
            'created_at',
            'updated_at',
          ],
          state.tasks.map((task) => [
            task.id,
            task.title,
            task.description,
            task.projectId,
            task.status,
            task.progress,
            task.priority,
            task.dueDate,
            task.postponedCount,
            task.createdAt,
            task.updatedAt,
          ]),
        );

        await insertMany(
          connection,
          'subtasks',
          ['id', 'task_id', 'title', 'done', 'created_at', 'updated_at'],
          state.subtasks.map((subtask) => [
            subtask.id,
            subtask.taskId,
            subtask.title,
            subtask.done ? 1 : 0,
            subtask.createdAt,
            subtask.updatedAt,
          ]),
        );

        await insertMany(
          connection,
          'quick_tasks',
          ['id', 'title', 'done', 'created_at', 'updated_at'],
          (state.quickTasks ?? []).map((quickTask) => [
            quickTask.id,
            quickTask.title,
            quickTask.done ? 1 : 0,
            quickTask.createdAt,
            quickTask.updatedAt,
          ]),
        );

        await insertMany(
          connection,
          'time_sessions',
          ['id', 'task_id', 'start_at', 'end_at'],
          state.timeSessions.map((session) => [
            session.id,
            session.taskId,
            session.startAt,
            session.endAt,
          ]),
        );

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    close: async () => {
      await pool.end();
    },
  };
};

let stateStore;
try {
  stateStore = shouldUseMySql ? await createMySqlStore() : await createFileStore();
} catch (error) {
  console.error('storage init failed, using memory fallback:', error);
  stateStore = createMemoryStore();
}

let writeQueue = Promise.resolve();
const writeState = async (state) => {
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      await stateStore.write(state);
    });

  await writeQueue;
};

const app = express();
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'todo-api', storage: stateStore.kind });
});

app.get('/api/state', async (_req, res) => {
  const state = await stateStore.read();
  res.json(state);
});

app.put('/api/state', async (req, res) => {
  const incoming = req.body;
  if (!isStateShape(incoming)) {
    return res.status(400).json({ error: 'INVALID_STATE_PAYLOAD' });
  }

  await writeState(incoming);
  return res.status(204).end();
});

const distPath = path.resolve(__dirname, '..', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }

    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.status(503).send('Frontend no compilado. Ejecuta build antes de iniciar.');
  });
}

const server = app.listen(PORT, () => {
  console.log(`todo server listening on http://0.0.0.0:${PORT}`);
  console.log(`storage: ${stateStore.kind}`);
  if (stateStore.kind === 'file') {
    console.log(`state file: ${DATA_FILE}`);
  } else {
    console.log(`mysql: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
  }
});

const shutdown = async () => {
  server.close(async () => {
    await stateStore.close();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
