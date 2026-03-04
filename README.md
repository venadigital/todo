# To Do Vena Digital

Tablero Kanban estilo IDE/retro con:

- tareas, subtareas y proyectos
- drag and drop
- control de tiempo por tarea
- dashboard diario/semanal/mensual
- persistencia local y sincronizacion entre dispositivos via backend

## Stack

- Frontend: React + Vite + TypeScript + Zustand
- Backend: Node.js + Express
- Persistencia backend: MySQL (produccion) o archivo JSON (`data/todo-board-state.json`) en modo local

## Scripts

- `npm run dev`: frontend Vite
- `npm run dev:api`: backend API (`http://127.0.0.1:8787`)
- `npm run dev:full`: frontend + backend en paralelo
- `npm run build`: build frontend
- `npm run start`: servidor Node para produccion (API + archivos `dist`)
- `npm run test`
- `npm run lint`

## Desarrollo local

1. Instalar dependencias

```bash
npm install
```

2. Levantar todo (frontend + backend)

```bash
npm run dev:full
```

3. Abrir:

- Frontend: `http://127.0.0.1:5173`
- API health: `http://127.0.0.1:8787/api/health`

## Sincronizacion entre dispositivos

La app intenta:

1. cargar estado remoto desde `GET /api/state` al iniciar
2. guardar cambios en remoto con `PUT /api/state`

Si el backend no responde, la app sigue funcionando con `localStorage`.

Variables opcionales frontend:

- `VITE_REMOTE_SYNC=false` desactiva sync remota
- `VITE_STATE_ENDPOINT=/api/state` cambia endpoint

## Despliegue en Hostinger (Node.js)

Config recomendada:

- Install command: `npm ci`
- Build command: `npm run build`
- Start command: `npm run start`
- Node version: `20` o superior compatible (`>=20 <25`)

Variables recomendadas de backend (MySQL):

- `STORAGE_DRIVER=mysql`
- `DB_HOST=...`
- `DB_PORT=3306`
- `DB_USER=...`
- `DB_PASSWORD=...`
- `DB_NAME=...`
- `DB_SSL=true` (si tu plan lo requiere)
- `DB_POOL_SIZE=8` (opcional)

Variables opcionales de backend (modo archivo local):

- `PORT`: puerto asignado por Hostinger
- `DATA_FILE`: ruta completa del archivo de datos

Ejemplo (modo archivo):

- `DATA_FILE=/home/usuario/data/todo-board-state.json`

### Nota de storage

- Si `STORAGE_DRIVER=mysql` (o si existen `DB_HOST`, `DB_USER`, `DB_NAME`), el servidor usa MySQL.
- Si no hay configuracion MySQL, usa archivo JSON local.
- Endpoint de salud muestra el motor activo: `GET /api/health` retorna `storage: "mysql"` o `storage: "file"`.

## API minima

- `GET /api/health`
- `GET /api/state`
- `PUT /api/state`

`PUT /api/state` espera el objeto completo del estado (`AppStateV1`).
