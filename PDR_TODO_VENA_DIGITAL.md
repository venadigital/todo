# PDR - To Do Vena Digital

## 1. Resumen del producto
To Do Vena Digital es una aplicación web de gestión de tareas tipo tablero Kanban, diseñada para uso individual sin login, con estética híbrida entre entorno de desarrollo y videojuego retro.  
El producto permite organizar trabajo por proyectos, ejecutar tareas globales, controlar subtareas, medir tiempo real dedicado a actividades y sincronizar el estado entre dispositivos mediante backend propio.

## 2. Objetivo principal
Centralizar la planeación y ejecución diaria de trabajo en una interfaz rápida, visual y enfocada en productividad, con:

- gestión completa de tareas/subtareas/proyectos
- seguimiento de avance y vencimientos
- control de tiempo por tarea con dashboard analítico
- experiencia consistente en desktop y móvil

## 3. Tipo de usuario
- Usuario único (sin autenticación).
- Perfil operativo/creativo que necesita priorizar actividades y registrar tiempo de ejecución.

## 4. Alcance funcional implementado

### 4.1 Gestión de tareas
- Crear, editar y borrar tareas.
- Campos por tarea:
  - título
  - descripción
  - proyecto asociado (opcional)
  - estado (`Pendiente`, `En progreso`, `Hecho`)
  - progreso (`0..100`)
  - prioridad (`Baja`, `Media`, `Alta`)
  - fecha de vencimiento (opcional)
  - contador de posposiciones

### 4.2 Gestión de subtareas
- Crear, editar, completar y borrar subtareas desde:
  - formulario de tarea
  - vista de detalle de tarea
  - tarjeta (check rápido)
- Las subtareas están asociadas de forma estricta a una tarea.

### 4.3 Gestión de proyectos
- Crear, editar y borrar proyectos (nombre + color).
- Borrado en cascada:
  - al borrar proyecto, también se borran sus tareas, subtareas, sesiones de tiempo y tracking activo relacionado.

### 4.4 Vistas de trabajo
- `Por proyecto`: Kanban de 3 columnas con drag and drop.
- `Tareas globales`: vista consolidada de tareas de todos los proyectos.
- `Dashboard`: visualización de tiempo diario/semanal/mensual.
- `Vence hoy`: filtro rápido global por tareas con vencimiento del día (sin restringir por proyecto).

### 4.5 Filtros y búsqueda
- Búsqueda por texto (título/descripción).
- Filtro por proyecto.
- Filtro por estado.
- Filtro por vencimiento:
  - todos
  - vencidas
  - hoy
  - esta semana
  - sin fecha

### 4.6 Posponer tareas
- Acciones rápidas por tarjeta:
  - `+1d`
  - `+3d`
  - `+7d`
- Si no hay fecha, se crea usando fecha base actual.

### 4.7 Lista rápida de prioridades
- Sección independiente para “prioridades rápidas”.
- Alta rápida de ítems.
- Marcar/desmarcar completadas.
- Eliminar ítem.
- Limpiar completadas.
- Visualmente diferenciada del tablero principal.

### 4.8 Control de tiempo (“Trabajar ahora”)
- Iniciar/detener trabajo en una tarea.
- Registro de sesiones de tiempo por tarea.
- Estado de tracking activo global.
- Overlay de foco cuando hay tarea activa:
  - bloquea interacción del fondo
  - desenfoque de pantalla
  - contador grande en tiempo real
  - nombre de tarea activa
  - animación retro (personaje estilo pixel/mining con herramientas)

### 4.9 Dashboard de tiempo
- Períodos:
  - diario
  - semanal
  - mensual
- Métricas:
  - tiempo total dedicado
  - cantidad de tareas con registro
  - sesiones registradas
- Ranking de tareas por minutos dedicados.

### 4.10 Modales y acciones críticas
- Modal de confirmación para borrados destructivos.
- Detalle de tarea en modal para gestión fina de subtareas y acciones.

## 5. Reglas de negocio vigentes
- `status=done` fuerza `progress=100`.
- `progress=100` deriva en estado `done`.
- Estados intermedios se sincronizan automáticamente.
- Con subtareas:
  - todas completadas => tarea `done` y `100%`.
  - si se reabre una subtarea de una tarea cerrada => recalcula estado/progreso.
- Posposición incrementa `postponedCount`.
- Borrado de tarea elimina subtareas y sesiones asociadas.

## 6. UX/UI y diseño visual
- Idioma: español.
- Estilo visual:
  - base oscura negra/charcoal
  - estética IDE + retro arcade/pixel
  - tipografía y detalles “tech/pixel”
  - animaciones ligeras de ambientación
- Tarjetas de tarea compactas y expandibles al clic.
- Indicadores visuales por prioridad/estado/proyecto.

## 7. Responsive y accesibilidad
- Breakpoint móvil principal: `<=900px`.
- Sidebar móvil en modo drawer con backdrop.
- Cierre de drawer por backdrop y `Escape`.
- Tabs superiores en carril horizontal scrollable.
- Kanban móvil con swipe horizontal y `scroll-snap`.
- Ajustes de densidad de UI para pantallas pequeñas.
- Controles críticos con foco visible y atributos ARIA básicos.

## 8. Arquitectura técnica

### 8.1 Frontend
- React + Vite + TypeScript
- Zustand para estado global
- DnD con `@dnd-kit`
- `date-fns` para cálculos de fechas/periodos

### 8.2 Backend
- Node.js + Express
- API simple:
  - `GET /api/health`
  - `GET /api/state`
  - `PUT /api/state`

### 8.3 Persistencia
- Cliente:
  - `localStorage` con estado versionado (`AppStateV1`)
- Servidor:
  - MySQL (producción recomendada)
  - fallback a archivo JSON
  - fallback extremo a memoria si falla inicialización de storage

### 8.4 Sincronización
- La app intenta hidratar desde backend al iniciar.
- Si remoto está vacío y local tiene datos, sube local automáticamente.
- Cambios posteriores se sincronizan con debounce.
- Si falla remoto, la app sigue operando localmente.

## 9. Modelo de datos (alto nivel)
- `Project`
- `Task`
- `Subtask`
- `QuickTask`
- `TimeSession`
- `ActiveTracking`
- `BoardFilters`
- `AppStateV1` como snapshot completo de estado

## 10. Entorno y despliegue

### 10.1 Variables clave
- `STORAGE_DRIVER=mysql|file`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSL`
- `VITE_STATE_ENDPOINT` (default `/api/state`)
- `VITE_REMOTE_SYNC` (default activo)

### 10.2 Hostinger (Node + GitHub)
- Flujo recomendado:
  1. push a `main`
  2. Hostinger despliega desde repo
  3. backend sirve API y frontend build (`dist`)
- Verificación:
  - `/api/health` debe retornar `ok:true` y storage activo (`mysql`/`file`)

## 11. Calidad y pruebas
- Lint con ESLint.
- Testing con Vitest (store/selectores/time tracking).
- Build de producción con TypeScript + Vite.
- Validación manual UX:
  - desktop + móvil
  - drawer
  - tabs
  - filtros
  - DnD
  - tracking y dashboard

## 12. Fuera de alcance actual
- Multiusuario y autenticación.
- Permisos/roles.
- Colaboración en tiempo real.
- Notificaciones push/email.
- Historial/auditoría avanzada.
- Integraciones externas (calendar, Slack, etc.).

## 13. Riesgos y consideraciones
- Sin autenticación: cualquier acceso al dominio manipula el mismo estado remoto.
- API basada en snapshot completo: riesgo de sobrescritura si hay uso concurrente intenso.
- Dependencia de disponibilidad de backend para sincronía cross-device.

## 14. Próximos pasos sugeridos (roadmap)
1. Autenticación básica por usuario y partición de datos.
2. API por recursos (`/tasks`, `/projects`, etc.) para reducir sobrescrituras.
3. Historial de actividad y reportes exportables.
4. Recordatorios de vencimiento y notificaciones.
5. Modo offline-first con cola de sincronización y resolución de conflictos.

---

Documento base PDR del proyecto To Do Vena Digital.  
Última actualización: 2026-03-18.
