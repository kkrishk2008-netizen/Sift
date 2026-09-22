// Supabase Edge Function: extract
// Turns text or an image into structured Sift items with a multimodal LLM.
// The AI key lives ONLY here (Supabase secret), never in the mobile app.
//
// Secrets:  AI_PROVIDER (anthropic | openai), AI_API_KEY, AI_MODEL, AI_BASE_URL (openai-compatible only)
// Deploy:   supabase functions deploy extract

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const MAX_TEXT = 20_000;
const MAX_IMAGE_B64 = 7_000_000; // ~5 MB binary
const MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function systemPrompt(ctx: { localDate: string; weekday: string; tz: string }): string {
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

TODAY is ${ctx.localDate} (${ctx.weekday}). The user's timezone is ${ctx.tz}. Resolve every relative date from TODAY.

RULES
1. Split one input into separate items when it contains separate actions (e.g. three things in one voice note = three items). Extra requirements of one action ("also bring your ID card") belong in that item's description. If a requirement is a distinct action for a distinct event, make it its own task.
2. NEVER invent information. If a date, time, venue or person is not stated or clearly implied, use null (or []). Do not guess a year, a venue or a time. If there is no deadline, deadline = null.
3. Relative dates: "tomorrow", "kal", "naale", "naalai", "repu", "nale" = tomorrow. "parso" = day after tomorrow. "aaj", "innu", "today" = today. A weekday name = its next occurrence (today only if it is that weekday and the time is still ahead). "25 September" with no year = the next upcoming 25 September.
4. Times are 24-hour HH:mm. With no am/pm: "5 baje" or "at 5" = 17:00 for 1-6, and 07:00-11:00 morning for 7-11, unless the words shaam/evening/raat/night/subah/morning say otherwise.
5. type: "task" = something the person must DO (submit, send, bring, pay, register). "event" = something that HAPPENS at a time/place (meeting, workshop, exam, hackathon, fest). "note" = information worth keeping with no action.
   Tasks: date/time = when it is due, deadline = that same moment (use 23:59 if only a date is known).
   Events: date/time = when it starts. deadline = registration / RSVP cut-off ONLY if the source states one, else null.
6. title: short natural English, at most 60 characters, verb-first for tasks ("Submit DS assignment", "Send PPT to Ravi", "Meeting with professor"). Translate to English but keep names and acronyms ("sir" or "ma'am" = professor).
7. description: one or two useful English sentences (what to bring, requirements). Empty string if nothing to add.
8. original_text: the exact words from the source for this item, in the ORIGINAL language, not translated.
9. priority: urgent = due today AND explicitly urgent/immediate, or overdue. high = due tomorrow, or a registration / last-date within a week. medium = due within 7 days or an action with no deadline. low = later than a week or just informational.
10. people: names of people involved (e.g. "Rohit"). links: full URLs only.
11. confidence: 0 to 1, how sure you are that the item and its fields are right.
12. If the input contains nothing actionable, return {"items":[]}.
For images: read ALL visible text, including small print. Ignore logos and decoration. Merge related poster text into one item.`;
}

function parseLoose(text: string): unknown {
  const cleaned = text.replace(/```json|```/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const s = cleaned.indexOf('{');
    const e = cleaned.lastIndexOf('}');
    if (s >= 0 && e > s) return JSON.parse(cleaned.slice(s, e + 1));
    throw new Error('malformed');
  }
}

async function callAnthropic(system: string, userText: string, image?: { b64: string; mime: string }) {
  const content: unknown[] = [];
  if (image) content.push({ type: 'image', source: { type: 'base64', media_type: image.mime, data: image.b64 } });
  content.push({ type: 'text', text: userText });
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': Deno.env.get('AI_API_KEY') ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: Deno.env.get('AI_MODEL') ?? 'claude-sonnet-5',
      max_tokens: 2000,
      system,
      messages: [{ role: 'user', content }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return (data.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
}

async function callGemini(system: string, userText: string, image?: { b64: string; mime: string }) {
  const model = Deno.env.get('AI_MODEL') || 'gemini-flash-lite-latest';
  const key = Deno.env.get('AI_API_KEY') || '';
  const parts: unknown[] = [{ text: `${system}\n\n${userText}` }];
  if (image) {
    parts.push({
      inline_data: {
        mime_type: image.mime,
        data: image.b64,
      },
    });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
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

  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callOpenAICompatible(system: string, userText: string, image?: { b64: string; mime: string }) {
  const base = (Deno.env.get('AI_BASE_URL') ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const parts: unknown[] = [{ type: 'text', text: userText }];
  if (image) parts.push({ type: 'image_url', image_url: { url: `data:${image.mime};base64,${image.b64}` } });
  const body: Record<string, unknown> = {
    model: Deno.env.get('AI_MODEL'),
    temperature: 0,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: parts },
    ],
  };
  if (Deno.env.get('AI_JSON_MODE') !== 'false') body.response_format = { type: 'json_object' };
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${Deno.env.get('AI_API_KEY') ?? ''}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`openai-compatible ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  if (!Deno.env.get('AI_API_KEY')) return json({ error: 'ai_not_configured' }, 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const kind = body.kind;
  const localDate = typeof body.local_date === 'string' ? body.local_date : new Date().toISOString().slice(0, 10);
  const weekday = typeof body.local_weekday === 'string' ? body.local_weekday : '';
  const tz = typeof body.timezone === 'string' ? body.timezone : 'Asia/Kolkata';
  const system = systemPrompt({ localDate, weekday, tz });

  let userText: string;
  let image: { b64: string; mime: string } | undefined;

  if (kind === 'text') {
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) return json({ error: 'empty' }, 400);
    if (text.length > MAX_TEXT) return json({ error: 'too_long' }, 413);
    const src = body.source === 'voice' ? 'a voice-note transcript' : body.source === 'image' ? 'text read from a poster' : 'a shared message';
    userText = `Input (${src}):\n"""\n${text}\n"""\nReturn the JSON.`;
  } else if (kind === 'image') {
    const b64 = typeof body.image_base64 === 'string' ? body.image_base64 : '';
    const mime = typeof body.mime === 'string' ? body.mime : 'image/jpeg';
    if (!b64 || !MIMES.includes(mime)) return json({ error: 'invalid_image' }, 422);
    if (b64.length > MAX_IMAGE_B64) return json({ error: 'invalid_image' }, 413);
    image = { b64, mime };
    userText = 'This image is a poster, notice or screenshot. Extract every actionable item. Return the JSON.';
  } else {
    return json({ error: 'bad_request' }, 400);
  }

  try {
    const provider = (Deno.env.get('AI_PROVIDER') ?? 'anthropic').toLowerCase();
    const raw =
      provider === 'gemini'
        ? await callGemini(system, userText, image)
        : provider === 'openai'
          ? await callOpenAICompatible(system, userText, image)
          : await callAnthropic(system, userText, image);
    let parsed: unknown;
    try {
      parsed = parseLoose(raw);
    } catch {
      return json({ error: 'malformed' }, 502);
    }
    const items = Array.isArray(parsed) ? parsed : (parsed as { items?: unknown })?.items;
    if (!Array.isArray(items)) return json({ error: 'malformed' }, 502);
    return json({ items });
  } catch (e) {
    console.error('extract failed', e instanceof Error ? e.message : e);
    return json({ error: 'ai_failed' }, 502);
  }
});
