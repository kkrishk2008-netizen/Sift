import { AI_TIMEOUT_MS } from '../../constants/config';
import { ExtractionError, ExtractionInput } from '../../types';
import { localTimeZone } from '../../utils/date';
import { supabase } from '../supabase/client';

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new ExtractionError('timeout', 'The AI took too long to respond')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/**
 * Calls the `extract` Supabase Edge Function. The AI key lives ONLY there.
 * Returns the raw JSON (validated afterwards by normalizeItems).
 */
export async function remoteExtract(input: ExtractionInput, now: Date): Promise<unknown> {
  if (!supabase) throw new ExtractionError('ai_failed', 'Supabase is not configured');

  const body =
    input.kind === 'text'
      ? { kind: 'text', text: input.text, source: input.source }
      : { kind: 'image', image_base64: input.base64, mime: input.mime, source: 'image' };

  const call = supabase.functions.invoke('extract', {
    body: {
      ...body,
      now_iso: now.toISOString(),
      // The user's LOCAL calendar date + weekday: "tomorrow" is resolved from this, never from the server clock.
      local_date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      local_weekday: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()],
      timezone: localTimeZone(),
    },
  });

  const { data, error } = await withTimeout(
    call as Promise<{ data: unknown; error: { name?: string; message: string } | null }>,
    AI_TIMEOUT_MS,
  );

  if (error) {
    const name = (error as { name?: string }).name ?? '';
    if (name === 'FunctionsFetchError') throw new ExtractionError('network', 'No internet connection');
    // Try to read the server's error code
    let code: string | undefined;
    try {
      const ctx = (error as unknown as { context?: { json?: () => Promise<{ error?: string }> } }).context;
      const payload = await ctx?.json?.();
      code = payload?.error;
    } catch {
      /* ignore */
    }
    if (code === 'malformed') throw new ExtractionError('malformed');
    if (code === 'invalid_image') throw new ExtractionError('invalid_image');
    throw new ExtractionError('ai_failed', error.message);
  }
  if (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
    const c = String((data as { error: unknown }).error);
    throw new ExtractionError(c === 'malformed' ? 'malformed' : 'ai_failed', c);
  }
  return data;
}
