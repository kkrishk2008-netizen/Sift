/**
 * Shared normalization: whatever produced the items (cloud AI or offline extractor),
 * they all pass through here so the app only ever sees clean, validated, prioritized data.
 */
import {
  DraftItem,
  ExtractedItem,
  ExtractionError,
  ItemType,
  Priority,
  Source,
} from '../../types';
import { combineLocal, normalizeHM, parseYMD, toYMD } from '../../utils/date';
import { computePriority, isPriority } from '../../utils/priority';

const TYPES: ItemType[] = ['task', 'event', 'note'];
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

function cleanList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out = v.map((x) => str(x)).filter(Boolean);
  return Array.from(new Set(out));
}

function normalizeDeadline(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = combineLocal(s, null, '23:59');
    return d ? d.toISOString() : null;
  }
  // "2026-09-25T17:00:00" without offset is parsed as local time by JS, which is what we want
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export interface NormalizeContext {
  source: Source;
  originalFallback: string;
  now?: Date;
}

/** Validate + coerce one raw object into an ExtractedItem, or null if unusable. */
export function normalizeItem(raw: unknown, ctx: NormalizeContext): ExtractedItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = str(r.title).slice(0, 120);
  if (!title) return null;

  const type: ItemType = TYPES.includes(r.type as ItemType) ? (r.type as ItemType) : 'task';
  const dateObj = parseYMD(str(r.date));
  const date = dateObj ? toYMD(dateObj) : null;
  const time = normalizeHM(str(r.time));
  let deadline = normalizeDeadline(r.deadline);
  // A task with a date but no explicit deadline is due at that date/time.
  if (!deadline && type === 'task' && date) {
    const d = combineLocal(date, time, '23:59');
    deadline = d ? d.toISOString() : null;
  }

  const description = str(r.description);
  const original = str(r.original_text) || ctx.originalFallback;
  const aiPriority: Priority | null = isPriority(r.priority) ? r.priority : null;
  const conf = typeof r.confidence === 'number' && isFinite(r.confidence) ? Math.min(1, Math.max(0, r.confidence)) : 0.7;

  const priority = computePriority({
    type,
    date,
    time,
    deadline,
    text: `${title} ${description} ${original}`,
    aiPriority,
    now: ctx.now,
  });

  return {
    type,
    title,
    description,
    date,
    time,
    deadline,
    venue: str(r.venue) || null,
    priority,
    people: cleanList(r.people),
    links: cleanList(r.links).filter((l) => /^(https?:\/\/|www\.)/i.test(l)),
    source: ctx.source,
    original_text: original,
    confidence: conf,
  };
}

/** Accepts `{items: [...]}` or a bare array. Throws `malformed` / `no_actions`. */
export function normalizeItems(raw: unknown, ctx: NormalizeContext): DraftItem[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items)
      ? ((raw as { items: unknown[] }).items)
      : null;
  if (!list) throw new ExtractionError('malformed', 'Response did not contain an items array');
  const items = list.map((x) => normalizeItem(x, ctx)).filter((x): x is ExtractedItem => x !== null);
  if (items.length === 0) throw new ExtractionError('no_actions', 'No actionable items found');
  return items;
}

/** Tolerant JSON parse for LLM text: strips ``` fences and grabs the outermost {...}. */
export function parseLooseJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const s = cleaned.indexOf('{');
    const e = cleaned.lastIndexOf('}');
    if (s >= 0 && e > s) {
      try {
        return JSON.parse(cleaned.slice(s, e + 1));
      } catch {
        /* fall through */
      }
    }
    throw new ExtractionError('malformed', 'AI returned malformed JSON');
  }
}
