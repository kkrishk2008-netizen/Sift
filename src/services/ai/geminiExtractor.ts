import { GEMINI_API_KEY } from '../../constants/config';
import { ExtractionError, ExtractionInput } from '../../types';
import { localTimeZone } from '../../utils/date';

const MODELS = ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-3-flash-preview'];

function buildPrompt(now: Date): string {
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
  const tz = localTimeZone();

  return `You are the extraction engine of Sift, an inbox for Indian students and professionals.
You convert messy inputs (posters, notices, screenshots, WhatsApp messages, voice-note transcripts) written in English, Hinglish, Hindi, Malayalam, Tamil, Telugu, Kannada or any mix into structured, actionable items.

Reply with ONLY a JSON object. No prose, no markdown fences:
{"items":[{
  "type": "task" | "event" | "note",
  "title": string,
  "description": string,
  "date": "YYYY-MM-DD" | null,
  "time": "HH:mm" | null,
  "deadline": "YYYY-MM-DDTHH:mm:00" | null,
  "venue": string | null,
  "priority": "low" | "medium" | "high" | "urgent",
  "people": string[],
  "links": string[],
  "original_text": string,
  "confidence": number
}]}

TODAY is ${localDate} (${weekday}). The user's timezone is ${tz}. Resolve every relative date from TODAY.

RULES:
1. Split one input into separate items when it contains separate actions.
2. NEVER invent information. If date, time, venue or person is not stated or clearly implied, use null (or []).
3. Relative dates: "tomorrow", "kal", "naale", "naalai", "repu" = tomorrow. "parso" = day after tomorrow. "aaj", "today" = today.
4. Times are 24-hour HH:mm.
5. type: "task" = action to do. "event" = something that happens. "note" = reference information.
6. title: short natural English, at most 60 characters, verb-first for tasks.
7. description: useful details (what to bring, requirements).
8. original_text: exact words from the source in the original language.
9. priority: urgent = due today and urgent, or overdue. high = due tomorrow or registration within a week. medium = due within 7 days. low = later or informational.
10. If the input contains nothing actionable, return {"items":[]}.
For images: read ALL visible text, including small print. Merge related poster text into one item.`;
}

function parseLooseJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const s = cleaned.indexOf('{');
    const e = cleaned.lastIndexOf('}');
    if (s >= 0 && e > s) return JSON.parse(cleaned.slice(s, e + 1));
    throw new ExtractionError('malformed', 'Failed to parse JSON response from Gemini');
  }
}

export async function geminiExtract(input: ExtractionInput, now: Date): Promise<unknown> {
  if (!GEMINI_API_KEY) {
    throw new ExtractionError('ai_failed', 'Gemini API key is not configured');
  }

  const system = buildPrompt(now);
  const parts: unknown[] = [];

  if (input.kind === 'text') {
    const text = input.text.trim();
    if (!text) throw new ExtractionError('empty', 'Nothing to analyze');
    parts.push({
      text: `${system}\n\nInput (${input.source}):\n"""\n${text}\n"""\nExtract actionable items and return JSON.`,
    });
  } else if (input.kind === 'image') {
    if (!input.base64) throw new ExtractionError('invalid_image', 'Image data is empty');
    parts.push({
      text: `${system}\n\nThis image is a poster, notice, or screenshot. Extract every actionable item and return JSON.`,
    });
    parts.push({
      inline_data: {
        mime_type: input.mime || 'image/jpeg',
        data: input.base64,
      },
    });
  }

  let lastError: Error | null = null;

  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0,
            response_mime_type: 'application/json',
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        // If high demand or rate limit, retry with next model
        if (res.status === 503 || res.status === 429) {
          lastError = new Error(`Gemini ${model} busy (${res.status})`);
          continue;
        }
        throw new ExtractionError('ai_failed', `Gemini API error (${res.status}): ${errText.slice(0, 150)}`);
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!rawText) throw new ExtractionError('malformed', 'Gemini returned an empty response');

      const parsed = parseLooseJson(rawText);
      return parsed;
    } catch (e) {
      if (e instanceof ExtractionError && e.code === 'malformed') throw e;
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw new ExtractionError('ai_failed', lastError?.message ?? 'Gemini was unavailable');
}
