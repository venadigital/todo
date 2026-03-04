import express from 'express';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 8787);
const DATA_FILE = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.resolve(process.cwd(), 'data', 'todo-board-state.json');

const defaultState = {
  version: 1,
  projects: [],
  tasks: [],
  subtasks: [],
  filters: {
    query: '',
    projectId: 'all',
    status: 'all',
    due: 'all',
  },
  timeSessions: [],
  activeTracking: null,
};

const isObject = (value) => typeof value === 'object' && value !== null;

const isStateShape = (raw) =>
  isObject(raw) &&
  raw.version === 1 &&
  Array.isArray(raw.projects) &&
  Array.isArray(raw.tasks) &&
  Array.isArray(raw.subtasks) &&
  isObject(raw.filters) &&
  Array.isArray(raw.timeSessions) &&
  (raw.activeTracking === null || isObject(raw.activeTracking));

const ensureDataFile = async () => {
  const dir = path.dirname(DATA_FILE);
  await mkdir(dir, { recursive: true });

  if (!existsSync(DATA_FILE)) {
    await writeFile(DATA_FILE, JSON.stringify(defaultState, null, 2), 'utf-8');
  }
};

const readState = async () => {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return isStateShape(parsed) ? parsed : defaultState;
  } catch {
    return defaultState;
  }
};

let writeQueue = Promise.resolve();
const writeState = async (state) => {
  writeQueue = writeQueue.then(async () => {
    await writeFile(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  });
  await writeQueue;
};

const app = express();
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'todo-api' });
});

app.get('/api/state', async (_req, res) => {
  const state = await readState();
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
}

await ensureDataFile();

app.listen(PORT, () => {
  console.log(`todo server listening on http://0.0.0.0:${PORT}`);
  console.log(`state file: ${DATA_FILE}`);
});
