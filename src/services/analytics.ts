/**
 * Anonymous, minimal product analytics.
 * Only the event name, a tiny non-personal property bag and a random install id are stored.
 * No task text, no names, no emails.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuid } from '../utils/id';
import { supabase } from './supabase/client';

export type AnalyticsEvent =
  | 'app_opened'
  | 'image_uploaded'
  | 'voice_recorded'
  | 'message_processed'
  | 'task_created'
  | 'task_completed'
  | 'calendar_added';

const ID_KEY = 'sift.anon_id';
let anonId: string | null = null;

async function getAnonId(): Promise<string> {
  if (anonId) return anonId;
  try {
    const stored = await AsyncStorage.getItem(ID_KEY);
    if (stored) {
      anonId = stored;
      return stored;
    }
    anonId = uuid();
    await AsyncStorage.setItem(ID_KEY, anonId);
  } catch {
    anonId = anonId ?? uuid();
  }
  return anonId;
}

export function track(event: AnalyticsEvent, props: Record<string, string | number | boolean> = {}): void {
  // fire-and-forget: analytics must never affect the UI
  (async () => {
    try {
      if (__DEV__) console.log(`[analytics] ${event}`, props);
      if (!supabase) return;
      const id = await getAnonId();
      await supabase.from('analytics_events').insert({ anon_id: id, event, props });
    } catch {
      /* ignore */
    }
  })();
}
