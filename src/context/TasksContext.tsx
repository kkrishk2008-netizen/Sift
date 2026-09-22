import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { buildDemoTasks } from '../constants/demoData';
import { track } from '../services/analytics';
import { supabase } from '../services/supabase/client';
import { deleteAllRemote, deleteTaskRemote, fetchTasks, upsertTasks } from '../services/supabase/tasksRepo';
import type { DraftItem, Priority, Task } from '../types';
import { uuid } from '../utils/id';
import { useAuth } from './AuthContext';

interface TasksValue {
  tasks: Task[];
  loading: boolean;
  refreshing: boolean;
  getTask: (id: string) => Task | undefined;
  addItems: (items: DraftItem[]) => Task[];
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  toggleDone: (id: string) => void;
  setPriority: (id: string, p: Priority) => void;
  refresh: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const Ctx = createContext<TasksValue | null>(null);
const cacheKey = (owner: string) => `sift.tasks.v1.${owner}`;
const noop = () => undefined;

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const owner = auth.mode === 'user' && auth.userId ? auth.userId : auth.mode === 'demo' ? 'demo' : null;
  const remoteUser = auth.mode === 'user' ? auth.userId : null;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const tasksRef = useRef<Task[]>([]);
  tasksRef.current = tasks;
  const loadedOwner = useRef<string | null>(null);

  // ---- load: cache first (instant), then remote (source of truth for signed-in users)
  useEffect(() => {
    let cancelled = false;
    loadedOwner.current = null;
    if (!owner) {
      setTasks([]);
      setLoading(auth.mode === 'loading');
      return;
    }
    setLoading(true);
    (async () => {
      let local: Task[] | null = null;
      try {
        const raw = await AsyncStorage.getItem(cacheKey(owner));
        if (raw) local = JSON.parse(raw) as Task[];
      } catch {
        local = null;
      }
      if (cancelled) return;
      if (!local && owner === 'demo') local = buildDemoTasks(new Date(), null);
      setTasks(local ?? []);
      loadedOwner.current = owner;
      setLoading(false);

      if (remoteUser && supabase) {
        try {
          const remote = await fetchTasks(remoteUser);
          if (cancelled) return;
          const remoteIds = new Set(remote.map((t) => t.id));
          const localOnly = (local ?? []).filter((t) => !remoteIds.has(t.id));
          if (localOnly.length) await upsertTasks(localOnly, remoteUser).catch(noop);
          setTasks([...localOnly, ...remote]);
        } catch {
          /* offline: keep the cached list */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [owner, remoteUser, auth.mode]);

  // ---- persist cache
  useEffect(() => {
    if (owner && loadedOwner.current === owner) {
      AsyncStorage.setItem(cacheKey(owner), JSON.stringify(tasks)).catch(noop);
    }
  }, [tasks, owner]);

  const pushRemote = useCallback(
    (t: Task[]) => {
      if (remoteUser) upsertTasks(t, remoteUser).catch(noop);
    },
    [remoteUser],
  );

  const getTask = useCallback((id: string) => tasksRef.current.find((t) => t.id === id), []);

  const addItems = useCallback(
    (items: DraftItem[]): Task[] => {
      const now = new Date().toISOString();
      const created: Task[] = items.map((it) => ({
        ...it,
        id: uuid(),
        user_id: remoteUser,
        status: 'open',
        created_at: now,
        updated_at: now,
        calendar_event_id: it.calendar_event_id ?? null,
      }));
      setTasks((prev) => [...created, ...prev]);
      pushRemote(created);
      created.forEach((c) => track('task_created', { type: c.type, source: c.source }));
      return created;
    },
    [remoteUser, pushRemote],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      const cur = tasksRef.current.find((t) => t.id === id);
      if (!cur) return;
      const next: Task = { ...cur, ...patch, id: cur.id, updated_at: new Date().toISOString() };
      setTasks((prev) => prev.map((t) => (t.id === id ? next : t)));
      pushRemote([next]);
    },
    [pushRemote],
  );

  const removeTask = useCallback(
    (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (remoteUser) deleteTaskRemote(id).catch(noop);
    },
    [remoteUser],
  );

  const toggleDone = useCallback(
    (id: string) => {
      const cur = tasksRef.current.find((t) => t.id === id);
      if (!cur) return;
      const done = cur.status === 'open';
      updateTask(id, { status: done ? 'done' : 'open' });
      if (done) track('task_completed', { type: cur.type });
    },
    [updateTask],
  );

  const setPriority = useCallback((id: string, p: Priority) => updateTask(id, { priority: p }), [updateTask]);

  const refresh = useCallback(async () => {
    if (!remoteUser) return;
    setRefreshing(true);
    try {
      setTasks(await fetchTasks(remoteUser));
    } catch {
      /* keep cache */
    } finally {
      setRefreshing(false);
    }
  }, [remoteUser]);

  const resetDemoData = useCallback(async () => {
    const fresh = buildDemoTasks(new Date(), remoteUser);
    setTasks(fresh);
    pushRemote(fresh);
  }, [remoteUser, pushRemote]);

  const clearAll = useCallback(async () => {
    setTasks([]);
    if (remoteUser) await deleteAllRemote(remoteUser).catch(noop);
  }, [remoteUser]);

  const value = useMemo<TasksValue>(
    () => ({
      tasks, loading, refreshing, getTask, addItems, updateTask, removeTask, toggleDone,
      setPriority, refresh, resetDemoData, clearAll,
    }),
    [tasks, loading, refreshing, getTask, addItems, updateTask, removeTask, toggleDone, setPriority, refresh, resetDemoData, clearAll],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTasks(): TasksValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTasks must be used inside TasksProvider');
  return v;
}
