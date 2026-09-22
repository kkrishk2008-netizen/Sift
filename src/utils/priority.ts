import type { ItemType, Priority } from '../types';
import { diffDays, getDueDate } from './date';

export const PRIORITY_ORDER: Priority[] = ['low', 'medium', 'high', 'urgent'];
export const rankPriority = (p: Priority): number => PRIORITY_ORDER.indexOf(p);

export function bumpPriority(p: Priority, by = 1): Priority {
  const i = Math.min(PRIORITY_ORDER.length - 1, Math.max(0, rankPriority(p) + by));
  return PRIORITY_ORDER[i];
}

export function isPriority(v: unknown): v is Priority {
  return typeof v === 'string' && (PRIORITY_ORDER as string[]).includes(v);
}

/** Explicit urgency: English + Hinglish. */
export const URGENT_RE =
  /\b(urgent(?:ly)?|immediately|asap|a\.s\.a\.p|right now|emergency|at once|turant|jaldi|abhi)\b/i;

/** "This matters" words: deadlines, registrations, last dates. */
export const IMPORTANT_RE =
  /\b(important|last date|last day|deadline|closes|closing|closed|register|registration|mandatory|compulsory|must|zaroori|zaruri|don'?t forget|do not forget|final)\b/i;

export interface PriorityInput {
  type: ItemType;
  date: string | null;
  time: string | null;
  deadline: string | null;
  /** All text that may signal urgency (title + description + original). */
  text: string;
  /** The model's own guess. Only used when there is no date to reason about. */
  aiPriority?: Priority | null;
  now?: Date;
}

/**
 * Deadline today + urgent words -> URGENT      (or < 4h left, or overdue)
 * Deadline tomorrow            -> HIGH
 * Deadline within 7 days       -> MEDIUM       (HIGH if it is a registration / last date)
 * Later                        -> LOW
 * No date                      -> MEDIUM for actions, LOW for notes (model hint allowed)
 */
export function computePriority(input: PriorityInput): Priority {
  const now = input.now ?? new Date();
  const urgentWords = URGENT_RE.test(input.text);
  const important = IMPORTANT_RE.test(input.text);
  const due = getDueDate(input);

  if (!due) {
    let base: Priority = input.type === 'note' ? 'low' : 'medium';
    if (input.aiPriority && input.aiPriority !== 'urgent') base = input.aiPriority;
    if (important && rankPriority(base) < rankPriority('medium')) base = 'medium';
    if (urgentWords) base = bumpPriority(base);
    return rankPriority(base) > rankPriority('high') ? 'high' : base;
  }

  const days = diffDays(now, due);
  let p: Priority;
  if (days < 0) {
    p = input.type === 'event' ? 'low' : 'urgent'; // past events are not urgent, overdue tasks are
  } else if (days === 0) {
    const hoursLeft = (due.getTime() - now.getTime()) / 3_600_000;
    p = urgentWords || important || hoursLeft <= 4 ? 'urgent' : 'high';
  } else if (days === 1) {
    p = 'high';
  } else if (days <= 7) {
    p = important ? 'high' : 'medium';
  } else {
    p = important ? 'medium' : 'low';
  }
  if (urgentWords) p = bumpPriority(p);
  return p;
}
