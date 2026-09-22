import { GEMINI_API_KEY } from '../../constants/config';
import { ExtractionError } from '../../types';

const MODELS = ['gemini-flash-lite-latest', 'gemini-flash-latest'];

/**
 * Converts a file URI into a base64 string using standard fetch and FileReader.
 */
async function uriToBase64(uri: string): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read audio file'));
    reader.readAsDataURL(blob);
  });
}

export async function geminiTranscribeAudio(fileUri: string): Promise<{ text: string; engine: 'stt' }> {
  if (!GEMINI_API_KEY) {
    throw new ExtractionError('ai_failed', 'Gemini API key is not configured');
  }

  let base64Audio: string;
  try {
    base64Audio = await uriToBase64(fileUri);
  } catch {
    throw new ExtractionError('ai_failed', 'Could not read audio recording');
  }

  const prompt =
    'You are an accurate speech-to-text transcriber for voice notes. ' +
    'Transcribe this voice note exactly as spoken. ' +
    'If the speaker speaks in Hinglish (Hindi + English) or Indian languages, write the words in Roman script (English alphabet). ' +
    'Do not translate, keep the original spoken words. ' +
    'Output ONLY the raw transcription without commentary or quotes.';

  let lastError: Error | null = null;

  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: 'audio/m4a',
                    data: base64Audio,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!res.ok) {
        if (res.status === 503 || res.status === 429) {
          lastError = new Error(`Gemini ${model} busy (${res.status})`);
          continue;
        }
        throw new ExtractionError('ai_failed', `Gemini audio transcription error (${res.status})`);
      }

      const data = await res.json();
      const text = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
      if (!text) throw new ExtractionError('no_actions', 'No speech detected');

      return { text, engine: 'stt' };
    } catch (e) {
      if (e instanceof ExtractionError) throw e;
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw new ExtractionError('ai_failed', lastError?.message ?? 'Gemini speech transcription was unavailable');
}
