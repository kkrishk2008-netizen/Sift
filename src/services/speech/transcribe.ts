import { DEMO_TEXTS } from '../../constants/demoData';
import { IS_GEMINI_CONFIGURED, SUPABASE_ANON_KEY, SUPABASE_URL } from '../../constants/config';
import { ExtractionError } from '../../types';
import { isSupabaseConfigured, supabase } from '../supabase/client';
import { geminiTranscribeAudio } from './geminiTranscribe';

export interface Transcript {
  text: string;
  engine: 'stt' | 'demo';
}

/**
 * Speech -> text through the `transcribe` Edge Function or direct Gemini API.
 * In Demo Mode it returns a realistic Hinglish transcript so the flow is still demonstrable.
 */
export async function transcribeAudio(fileUri: string, demoMode: boolean): Promise<Transcript> {
  if (demoMode) {
    await new Promise((r) => setTimeout(r, 700));
    return { text: DEMO_TEXTS.voice, engine: 'demo' };
  }

  if (!isSupabaseConfigured && !IS_GEMINI_CONFIGURED) {
    await new Promise((r) => setTimeout(r, 700));
    return { text: DEMO_TEXTS.voice, engine: 'demo' };
  }

  if (isSupabaseConfigured) {
    try {
      const form = new FormData();
      // React Native's FormData accepts { uri, name, type } for files.
      form.append('file', { uri: fileUri, name: 'voice.m4a', type: 'audio/m4a' } as unknown as Blob);

      let token = SUPABASE_ANON_KEY;
      try {
        const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
        if (data.session?.access_token) token = data.session.access_token;
      } catch {
        /* use anon key */
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/transcribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
        body: form,
      });
      if (res.ok) {
        const json = (await res.json()) as { text?: string };
        const text = (json.text ?? '').trim();
        if (!text) throw new ExtractionError('no_actions', 'No speech detected');
        return { text, engine: 'stt' };
      }
    } catch (err) {
      if (!IS_GEMINI_CONFIGURED) {
        if (err instanceof ExtractionError) throw err;
        throw new ExtractionError('network', 'No internet connection');
      }
    }
  }

  if (IS_GEMINI_CONFIGURED) {
    try {
      return await geminiTranscribeAudio(fileUri);
    } catch (e) {
      if (e instanceof ExtractionError) throw e;
      throw new ExtractionError('ai_failed', 'Gemini speech-to-text failed');
    }
  }

  throw new ExtractionError('ai_failed', 'Speech recognition is not configured');
}
