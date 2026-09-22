import { colors, priorityMeta } from '../constants/theme';
import type { Task } from '../types';
import { diffDays, getDueDate, isSameDay, parseYMD, toYMD } from './date';
import { rankPriority } from './priority';

export type SectionKey = 'urgent' | 'today' | 'upcoming' | 'later';

export interface InboxSection {
  key: SectionKey;
  title: string;
  color: string;
  data: Task[];
}

const META: Record<SectionKey, { title: string; color: string }> = {
  urgent: { title: 'URGENT', color: priorityMeta.urgent.color },
  today: { title: 'TODAY', color: priorityMeta.high.color },
  upcoming: { title: 'UPCOMING', color: priorityMeta.medium.color },
  later: { title: 'LATER', color: colors.muted },
};

export function sectionOf(t: Task, now: Date): SectionKey {
  const due = getDueDate(t);
  const diff = due ? diffDays(now, due) : null;
  if (t.priority === 'urgent') return 'urgent';
  if (diff === null) return 'later';
  if (diff < 0) return t.type === 'event' ? 'later' : 'urgent'; // overdue task
  if (diff === 0) return 'today';
  return 'upcoming';
}

const dueMs = (t: Task): number => getDueDate(t)?.getTime() ?? Number.MAX_SAFE_INTEGER;

/** URGENT / TODAY / UPCOMING / LATER, each sorted by priority then time. */
export function buildSections(tasks: Task[], now: Date): InboxSection[] {
  const buckets: Record<SectionKey, Task[]> = { urgent: [], today: [], upcoming: [], later: [] };
  for (const t of tasks) if (t.status === 'open') buckets[sectionOf(t, now)].push(t);
  (Object.keys(buckets) as SectionKey[]).forEach((k) =>
    buckets[k].sort((a, b) => rankPriority(b.priority) - rankPriority(a.priority) || dueMs(a) - dueMs(b)),
  );
  return (['urgent', 'today', 'upcoming', 'later'] as SectionKey[])
    .filter((k) => buckets[k].length > 0)
    .map((k) => ({ key: k, ...META[k], data: buckets[k] }));
}

/** YYYY-MM-DD keys of every calendar day an item touches (its date and its deadline day). */
export function taskDayKeys(t: Task): string[] {
  const keys = new Set<string>();
  const d = parseYMD(t.date);
  if (d) keys.add(toYMD(d));
  if (t.deadline) {
    const dl = new Date(t.deadline);
    if (!isNaN(dl.getTime())) keys.add(toYMD(dl));
  }
  return Array.from(keys);
}

export interface DigestStats {
  urgent: number;
  dueToday: number;
  upcomingEvents: number;
  meaningful: number;
  noisy: number;
}

/** The "instead of 14 notifications, 4 things matter" numbers. */
export function digestStats(tasks: Task[], now: Date): DigestStats {
  const open = tasks.filter((t) => t.status === 'open');
  const urgent = open.filter((t) => sectionOf(t, now) === 'urgent');
  const today = open.filter((t) => sectionOf(t, now) === 'today' && t.type !== 'event');
  const events = open.filter((t) => {
    const due = getDueDate(t);
    return t.type === 'event' && due && diffDays(now, due) >= 0 && diffDays(now, due) <= 7;
  });
  const meaningful = new Set(
    [...urgent, ...open.filter((t) => sectionOf(t, now) === 'today'), ...events].map((t) => t.id),
  ).size;
  return {
    urgent: urgent.length,
    dueToday: today.length,
    upcomingEvents: events.length,
    meaningful,
    noisy: meaningful * 3 + 2,
  };
}

export const isToday = (d: Date, now: Date) => isSameDay(d, now);
