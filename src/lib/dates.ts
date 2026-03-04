import { addDays, format, isThisWeek, isToday, parseISO, startOfDay } from 'date-fns';

export const DATE_FORMAT = 'yyyy-MM-dd';

export const toISODate = (value: Date): string => format(value, DATE_FORMAT);

export const parseISODate = (value: string): Date => parseISO(value);

export const postponeDate = (dueDate: string | null, days: number): string => {
  const base = dueDate ? parseISODate(dueDate) : startOfDay(new Date());
  return toISODate(addDays(base, days));
};

export const isDueToday = (dueDate: string): boolean => isToday(parseISODate(dueDate));

export const isDueThisWeek = (dueDate: string): boolean =>
  isThisWeek(parseISODate(dueDate), { weekStartsOn: 1 });

export const isDueOverdue = (dueDate: string): boolean =>
  parseISODate(dueDate) < startOfDay(new Date());
