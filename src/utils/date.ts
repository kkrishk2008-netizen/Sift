export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const pad2 = (n: number): string => String(n).padStart(2, '0');

export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Parses the YYYY-MM-DD prefix of a string into a LOCAL midnight Date. */
export function parseYMD(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

export function normalizeHM(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s.trim());
  if (!m) return null;
  const h = +m[1];
  const mi = +m[2];
  if (h > 23 || mi > 59) return null;
  return `${pad2(h)}:${pad2(mi)}`;
}

export function combineLocal(
  ymd: string | null | undefined,
  hm: string | null | undefined,
  fallbackHM = '00:00',
): Date | null {
  const d = parseYMD(ymd);
  if (!d) return null;
  const t = normalizeHM(hm) ?? fallbackHM;
  const [h, m] = t.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

/** Whole calendar days from `from` to `to` (DST-safe). */
export function diffDays(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toYMD(a) === toYMD(b);
}

/** "17:00" -> "5:00 PM" */
export function formatTime(hm: string | null | undefined): string | null {
  const n = normalizeHM(hm ?? '');
  if (!n) return null;
  const [h, m] = n.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad2(m)} ${suffix}`;
}

export function formatDateShort(d: Date, now: Date = new Date()): string {
  const base = `${WEEKDAY_SHORT[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export function dayLabel(d: Date, now: Date = new Date()): string {
  const diff = diffDays(now, d);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return formatDateShort(d, now);
}

export const hasExplicitTime = (d: Date): boolean => !(d.getHours() === 23 && d.getMinutes() === 59);

type DateFields = { date: string | null; time: string | null; deadline: string | null };

/** When is the action due? A deadline wins; otherwise the date/time; end-of-day if no time. */
export function getDueDate(item: DateFields): Date | null {
  if (item.deadline) {
    const d = new Date(item.deadline);
    if (!isNaN(d.getTime())) return d;
  }
  return combineLocal(item.date, item.time, '23:59');
}

function labelFor(d: Date, now: Date): string {
  const label = dayLabel(d, now);
  return hasExplicitTime(d)
    ? `${label}, ${formatTime(`${pad2(d.getHours())}:${pad2(d.getMinutes())}`)}`
    : label;
}

/** Human label such as "Today, 5:00 PM" or "Fri, 25 Sep". */
export function formatWhen(item: DateFields, now: Date = new Date()): string | null {
  const d = combineLocal(item.date, item.time, '23:59') ?? getDueDate(item);
  return d ? labelFor(d, now) : null;
}

export function formatDeadline(item: DateFields, now: Date = new Date()): string | null {
  if (!item.deadline) return null;
  const d = new Date(item.deadline);
  return isNaN(d.getTime()) ? null : labelFor(d, now);
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning 👋';
  if (h < 17) return 'Good afternoon 👋';
  return 'Good evening 👋';
}

/** 6x7 grid of dates for a month, Sunday-first. */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
