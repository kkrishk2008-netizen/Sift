// Supabase Edge Function: transcribe
// Receives an audio file (multipart form field "file") and returns { text }.
// Uses any OpenAI-compatible Whisper endpoint (Groq by default: fast and has a free tier).
//
// Secrets:  SPEECH_API_KEY, SPEECH_API_URL, SPEECH_MODEL
// Deploy:   supabase functions deploy transcribe

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const MAX_BYTES = 12 * 1024 * 1024;

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function callGeminiTranscribe(file: File, key: string): Promise<string> {
  const model = Deno.env.get('SPEECH_MODEL') || 'gemini-flash-lite-latest';
  const base64Audio = await fileToBase64(file);
  const prompt =
    'You are an accurate speech-to-text transcriber for voice notes. ' +
    'Transcribe this voice note exactly as spoken. ' +
    'If the speaker speaks in Hinglish (Hindi + English) or Indian languages, write the words in Roman script (English alphabet). ' +
    'Do not translate, keep the original spoken words. ' +
    'Output ONLY the raw transcription without commentary or quotes.';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
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
                mime_type: file.type || 'audio/m4a',
                data: base64Audio,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`gemini stt ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const key = Deno.env.get('SPEECH_API_KEY');
  if (!key) return json({ error: 'speech_not_configured' }, 503);

  let file: File;
  try {
    const form = await req.formData();
    const f = form.get('file');
    if (!(f instanceof File)) return json({ error: 'no_file' }, 400);
    file = f;
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (file.size === 0) return json({ error: 'empty_audio' }, 400);
  if (file.size > MAX_BYTES) return json({ error: 'too_large' }, 413);

  const provider = (Deno.env.get('SPEECH_PROVIDER') ?? '').toLowerCase();
  if (provider === 'gemini') {
    try {
      const text = await callGeminiTranscribe(file, key);
      if (!text) return json({ error: 'empty_audio' }, 400);
      return json({ text });
    } catch (e) {
      console.error('gemini stt error', e instanceof Error ? e.message : e);
      return json({ error: 'stt_failed' }, 502);
    }
  }

  const out = new FormData();
  out.append('file', file, file.name || 'voice.m4a');
  out.append('model', Deno.env.get('SPEECH_MODEL') ?? 'whisper-large-v3');
  out.append('response_format', 'json');
  out.append('temperature', '0');
  // Steers Whisper towards Roman-script Hinglish instead of a forced Devanagari or English guess.
  out.append(
    'prompt',
    'A voice note by an Indian college student mixing Hindi and English (Hinglish). Topics: assignment submission, meetings, project PPT, deadlines, names like Rohit and Ravi. Write Hindi words in Roman script.',
  );

  try {
    const res = await fetch(Deno.env.get('SPEECH_API_URL') ?? 'https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: out,
    });
    if (!res.ok) {
      console.error('stt failed', res.status, (await res.text()).slice(0, 300));
      return json({ error: 'stt_failed' }, 502);
    }
    const data = await res.json();
    return json({ text: typeof data.text === 'string' ? data.text.trim() : '' });
  } catch (e) {
    console.error('stt error', e instanceof Error ? e.message : e);
    return json({ error: 'stt_failed' }, 502);
  }
});
