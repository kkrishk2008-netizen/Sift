/**
 * THE extraction engine. One entry point for every input type:
 *
 *   Image adapter ─┐
 *   Voice adapter ─┼─►  extractActions()  ─►  strict JSON  ─►  normalizeItems()  ─►  DraftItem[]
 *   Text adapter  ─┘         │
 *                            ├─ cloud AI (Supabase Edge Function)   when Demo Mode is OFF and configured
 *                            └─ offline extractor                    Demo Mode, no config, or AI failure (text only)
 */
import { IS_GEMINI_CONFIGURED } from '../../constants/config';
import { DEMO_TEXTS, demoPoster } from '../../constants/demoData';
import { ExtractionError, ExtractionInput, ExtractionResult } from '../../types';
import { isSupabaseConfigured } from '../supabase/client';
import { geminiExtract } from './geminiExtractor';
import { localExtract } from './localExtractor';
import { normalizeItems } from './normalize';
import { remoteExtract } from './remoteExtractor';

export interface ExtractOptions {
  demoMode: boolean;
  now?: Date;
}

export const DEMO_TRANSCRIPT = DEMO_TEXTS.voice;

export async function extractActions(input: ExtractionInput, opts: ExtractOptions): Promise<ExtractionResult> {
  const now = opts.now ?? new Date();

  if (input.kind === 'text' && !input.text.trim()) {
    throw new ExtractionError('empty', 'Nothing to analyze');
  }

  const useCloud = !opts.demoMode && (isSupabaseConfigured || IS_GEMINI_CONFIGURED);

  // ---------- offline / demo path ----------
  if (!useCloud) {
    if (input.kind === 'image') {
      // A phone can't read pixels without a vision model, so Demo Mode shows the sample poster's extraction.
      const poster = demoPoster(now);
      const items = normalizeItems(localExtract(poster.text, 'image', now), {
        source: 'image',
        originalFallback: poster.text,
        now,
      });
      return {
        items,
        engine: 'demo',
        notice: opts.demoMode
          ? 'Demo Mode: showing a sample poster extraction. Turn Demo Mode off and add your AI key to read real posters.'
          : 'AI is not configured yet, so this is a sample poster extraction.',
      };
    }
    const items = normalizeItems(localExtract(input.text, input.source, now), {
      source: input.source,
      originalFallback: input.text,
      now,
    });
    return {
      items,
      engine: opts.demoMode ? 'demo' : 'offline',
      notice: opts.demoMode ? undefined : 'AI is not configured, so Sift used its offline understanding.',
    };
  }

  // ---------- cloud AI / Gemini path ----------
  try {
    let raw: unknown;
    if (isSupabaseConfigured) {
      try {
        raw = await remoteExtract(input, now);
      } catch (err) {
        if (IS_GEMINI_CONFIGURED) {
          raw = await geminiExtract(input, now);
        } else {
          throw err;
        }
      }
    } else if (IS_GEMINI_CONFIGURED) {
      raw = await geminiExtract(input, now);
    }

    const items = normalizeItems(raw, {
      source: input.source,
      originalFallback: input.kind === 'text' ? input.text : '',
      now,
    });
    return { items, engine: 'ai' };
  } catch (e) {
    const err = e instanceof ExtractionError ? e : new ExtractionError('ai_failed', String(e));
    // Text can still be understood offline, so the user never dead-ends.
    if (input.kind === 'text' && err.code !== 'empty') {
      try {
        const items = normalizeItems(localExtract(input.text, input.source, now), {
          source: input.source,
          originalFallback: input.text,
          now,
        });
        return {
          items,
          engine: 'offline',
          notice:
            err.code === 'network'
              ? "You're offline, so Sift used its built-in understanding."
              : 'The AI was unavailable, so Sift used its built-in understanding.',
        };
      } catch {
        /* fall through to throw the original error */
      }
    }
    throw err;
  }
}

/** Friendly copy for the error panel. */
export function describeError(e: unknown): { title: string; hint: string } {
  const code = e instanceof ExtractionError ? e.code : 'ai_failed';
  const title = "Couldn't analyze this automatically.";
  switch (code) {
    case 'empty':
      return { title: 'There is nothing to analyze yet.', hint: 'Type or paste a message first.' };
    case 'network':
      return { title, hint: "You appear to be offline. Check your connection and try again, or create it manually." };
    case 'timeout':
      return { title, hint: 'The AI took too long. Try again, or create it manually.' };
    case 'invalid_image':
      return { title, hint: "That image couldn't be read. Try a clearer photo, or create it manually." };
    case 'no_actions':
      return { title, hint: "We couldn't find a task, event or deadline in this. Try again or create it manually." };
    case 'malformed':
      return { title, hint: 'The AI answered in an unexpected format. Try again, or create it manually.' };
    default:
      return { title, hint: 'Something went wrong on our side. Try again, or create it manually.' };
  }
}
