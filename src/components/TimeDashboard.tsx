import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Activity, CalendarRange, Clock3, Timer } from 'lucide-react';
import {
  buildTaskTimeRows,
  formatMinutes,
  getRangeForPeriod,
  type DashboardPeriod,
} from '../lib/timeTracking';
import type { ActiveTracking, Project, Task, TimeSession } from '../types';

interface TimeDashboardProps {
  tasks: Task[];
  projectsById: Map<string, Project>;
  timeSessions: TimeSession[];
  activeTracking: ActiveTracking | null;
  onOpenTask: (taskId: string) => void;
}

const periodLabels: Record<DashboardPeriod, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
};

export const TimeDashboard = ({
  tasks,
  projectsById,
  timeSessions,
  activeTracking,
  onOpenTask,
}: TimeDashboardProps) => {
  const [period, setPeriod] = useState<DashboardPeriod>('daily');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const projectNamesById = useMemo(() => {
    return new Map(Array.from(projectsById.entries()).map(([id, project]) => [id, project.name]));
  }, [projectsById]);

  const range = useMemo(() => getRangeForPeriod(period, now), [period, now]);

  const rows = useMemo(() => {
    return buildTaskTimeRows(tasks, projectNamesById, timeSessions, activeTracking, range, now);
  }, [tasks, projectNamesById, timeSessions, activeTracking, range, now]);

  const totalMinutes = rows.reduce((sum, row) => sum + row.minutes, 0);
  const topRow = rows[0];
  const maxMinutes = topRow?.minutes ?? 0;

  return (
    <section className="dashboard-panel">
      <header className="dashboard-header">
        <div>
          <h3>
            <span className="title-with-icon">
              <Timer size={12} aria-hidden="true" />
              Dashboard de tiempo
            </span>
          </h3>
          <p>
            {periodLabels[period]} · {format(range.start, 'yyyy-MM-dd')} a {format(range.end, 'yyyy-MM-dd')}
          </p>
        </div>
        <div className="dashboard-periods" role="tablist" aria-label="Periodo dashboard">
          {(['daily', 'weekly', 'monthly'] as DashboardPeriod[]).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={period === item}
              className={`dashboard-period ${period === item ? 'dashboard-period-active' : ''}`}
              onClick={() => setPeriod(item)}
            >
              {periodLabels[item]}
            </button>
          ))}
        </div>
      </header>

      <div className="dashboard-metrics">
        <article className="dashboard-metric">
          <span className="metric-title">
            <Clock3 size={11} aria-hidden="true" />
            Total dedicado
          </span>
          <strong>{formatMinutes(totalMinutes)}</strong>
        </article>
        <article className="dashboard-metric">
          <span className="metric-title">
            <Activity size={11} aria-hidden="true" />
            Tareas con registro
          </span>
          <strong>{rows.length}</strong>
        </article>
        <article className="dashboard-metric">
          <span className="metric-title">
            <CalendarRange size={11} aria-hidden="true" />
            Sesiones registradas
          </span>
          <strong>{timeSessions.length}</strong>
        </article>
      </div>

      {rows.length === 0 ? (
        <p className="dashboard-empty">No hay tiempo registrado en este periodo todavía.</p>
      ) : (
        <div className="dashboard-list">
          {rows.map((row) => {
            const width = maxMinutes > 0 ? (row.minutes / maxMinutes) * 100 : 0;

            return (
              <button
                key={row.taskId}
                type="button"
                className="dashboard-row"
                onClick={() => onOpenTask(row.taskId)}
              >
                <div className="dashboard-row__top">
                  <span className="dashboard-row__title">{row.taskTitle}</span>
                  <span className="dashboard-row__time">{formatMinutes(row.minutes)}</span>
                </div>
                <div className="dashboard-row__meta">{row.projectName}</div>
                <div className="dashboard-row__bar">
                  <div className="dashboard-row__bar-fill" style={{ width: `${Math.max(6, width)}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
