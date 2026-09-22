import type { Task } from '../../types';
import { normalizeHM } from '../../utils/date';
import { supabase } from './client';

type Row = Record<string, unknown>;

function rowToTask(r: Row): Task {
  return {
    id: String(r.id),
    user_id: (r.user_id as string) ?? null,
    type: r.type as Task['type'],
    title: String(r.title ?? ''),
    description: String(r.description ?? ''),
    date: (r.date as string) ?? null,
    time: normalizeHM(r.time) ?? null, // Postgres returns HH:mm:ss
    deadline: r.deadline ? new Date(r.deadline as string).toISOString() : null,
    venue: (r.venue as string) ?? null,
    priority: r.priority as Task['priority'],
    status: r.status as Task['status'],
    source: r.source as Task['source'],
    original_text: String(r.original_text ?? ''),
    people: (r.people as string[]) ?? [],
    links: (r.links as string[]) ?? [],
    confidence: Number(r.confidence ?? 0.7),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
    calendar_event_id: (r.calendar_event_id as string) ?? null,
  };
}

function taskToRow(t: Task, userId: string): Row {
  return {
    id: t.id,
    user_id: userId,
    type: t.type,
    title: t.title,
    description: t.description,
    date: t.date,
    time: t.time,
    deadline: t.deadline,
    venue: t.venue,
    priority: t.priority,
    status: t.status,
    source: t.source,
    original_text: t.original_text,
    people: t.people,
    links: t.links,
    confidence: t.confidence,
    calendar_event_id: t.calendar_event_id,
    created_at: t.created_at,
    updated_at: t.updated_at,
  };
}

export async function fetchTasks(userId: string): Promise<Task[]> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToTask(r as Row));
}

export async function upsertTasks(tasks: Task[], userId: string): Promise<void> {
  if (!supabase || tasks.length === 0) return;
  const { error } = await supabase.from('tasks').upsert(tasks.map((t) => taskToRow(t, userId)));
  if (error) throw error;
}

export async function deleteTaskRemote(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteAllRemote(userId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('tasks').delete().eq('user_id', userId);
  if (error) throw error;
}
