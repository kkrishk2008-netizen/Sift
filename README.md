# Sift 🧠📥

### An AI inbox that turns anything into an action.

Sift is a mobile app for Indian students and first-job professionals whose deadlines arrive as posters, WhatsApp messages, screenshots and voice notes — in a mix of English, Hinglish and regional languages. Instead of retyping all of that into a to-do app, you snap a poster, speak a messy voice note, or paste a chaotic group message, and Sift turns it into a structured, prioritized action.

```
Poster / Voice note / WhatsApp message  →  AI extraction  →  Prioritized inbox  →  Calendar
```

Built with **React Native (Expo) + TypeScript** and **Supabase** (Postgres with row-level security), with a multimodal LLM behind the scenes. **Works with zero setup in Demo Mode** — no API keys needed to try it. Add Supabase + AI keys to switch on the live AI pipeline.

## Why we built it

We're second-year college students, still early in our development journey — our background is mainly in web development, and mobile app development is genuinely new territory for us. Sift is one of our first real attempts at building a full mobile product end to end: AI extraction logic, calendar integration, and a cloud backend with Supabase.

One of us has a solid grounding in AI/ML, which shaped the core of the app — an extraction engine that understands messy, mixed-language input and turns it into structured, prioritized actions. We built a real priority engine, an offline fallback so the app never breaks without internet, and an actual AI pipeline behind it, not just a mockup. There's a lot we still have to learn, and we see this project as exactly that: a way to get better at building by building something real.

## ✨ Highlights

- **One extraction engine, three inputs** — a poster photo, a voice note, or a pasted message all flow through the same AI pipeline into the same structured schema.
- **Understands Hinglish and regional languages** — English, Hindi, Hinglish, Malayalam, Tamil, Telugu and Kannada cue words, with the original text preserved alongside a normalized English title.
- **One voice note → several tasks** — "Kal 5 baje assignment submit karna hai, Ravi ko PPT bhejna hai, aur Friday ko meeting hai" becomes three separate, dated actions.
- **A priority engine, not just a to-do list** — deadline proximity and urgency words (urgent, ASAP, last date) automatically sort items into Urgent / Today / Upcoming.
- **One-tap calendar add**, offline-first local storage, and a demo mode that works with no backend at all.

## 📱 Screenshots / Demo

_Add a screen recording or screenshots here before sharing the repo — see the 90-second demo script in section 2 below._

---

## 1. Run it (2 minutes, no keys needed)

```bash
npm install
npx expo install --fix     # aligns native package versions with your Expo SDK
npx expo start
```

Open with **Expo Go** (scan the QR code) or press `a` for an Android emulator.
On first launch: onboarding → **Continue as Demo User** → the inbox is pre-filled.

> **Expo SDK note:** `package.json` targets SDK 54. Expo Go only opens projects matching its own SDK.
> If Expo Go says the SDK is incompatible, run `npx expo install expo@latest && npx expo install --fix`
> (or install the matching Expo Go from https://expo.dev/go).

## 2. The 90-second demo (works in Demo Mode)

1. **Inbox** shows URGENT / TODAY / UPCOMING, with the digest card on top.
2. **Capture → Scan Poster → Use sample poster → Analyze** → "I found an action": date, time, venue, deadline → **Add to Calendar**.
3. **Capture → Voice Dump** → tap mic and speak (or **Use a sample voice note**) → one Hinglish note becomes **three** actions.
4. **Capture → Paste / Share Message → WhatsApp chaos** sample → deadline task with venue and "bring ID card".
5. **Save to Inbox** → everything is unified and prioritized. Open **Settings → Preview my digest** for the finale.

Shortcut: Capture has one-tap **demo scenario** chips that run the whole pipeline.

## 3. What is real vs. simulated

| Feature | Demo Mode ON (default without keys) | Demo Mode OFF + keys |
|---|---|---|
| Text / message / voice-transcript → actions | Built-in rule-based extractor (English, Hinglish, Hindi/Malayalam/Tamil/Telugu/Kannada cue words) | Cloud LLM via Supabase Edge Function |
| Poster / image | Shows the **sample poster's** extraction (a phone can't read pixels without a vision model) | Real multimodal LLM reads your photo |
| Voice | Real microphone recording, **sample Hinglish transcript** used | Real speech-to-text (Whisper-class) |
| Calendar | Real device calendar | Same |
| Storage | On-device (AsyncStorage) | Supabase Postgres + RLS, cached on-device |

If the cloud AI fails for **text**, Sift silently falls back to the offline extractor so the demo never dead-ends.
If it fails for an **image** or **voice**, the user sees *"Couldn't analyze this automatically"* with **Try Again / Create Manually**.

## 4. Turn on the real backend

### a) Supabase project
1. Create a project at https://supabase.com.
2. SQL Editor → paste and run `supabase/schema.sql` (tables + Row Level Security).
3. Authentication → Providers → Email. For hackathon speed, turn **Confirm email OFF**.
4. Copy the URL and anon key into `.env` (copy from `.env.example`):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

### b) AI + speech keys (server-side only)
```bash
npm i -g supabase            # or: npx supabase ...
supabase login
supabase link --project-ref <your-ref>

cp supabase/.env.example supabase/.env   # fill AI_API_KEY, SPEECH_API_KEY
supabase secrets set --env-file supabase/.env
supabase functions deploy extract
supabase functions deploy transcribe
```
- `AI_PROVIDER=anthropic` (default) or `openai` (any OpenAI-compatible API: OpenAI, Gemini's OpenAI endpoint, Groq…; set `AI_BASE_URL` and `AI_MODEL`).
- Speech defaults to Groq's Whisper (`whisper-large-v3`, good with Hinglish). Any OpenAI-compatible transcription URL works.
- **Keys never ship in the app.** The app only holds the public Supabase URL + anon key.

### c) Restart with a clean cache
```bash
npx expo start -c
```
Settings → toggle **Demo Mode OFF**. Settings shows "Cloud AI: Connected".

## 5. Android testing

- **Phone:** install Expo Go, same Wi-Fi as your laptop, scan the QR. (`npx expo start --tunnel` if the network blocks it.)
- **Emulator:** Android Studio → Device Manager → start a device → press `a` in the Expo terminal. For the emulator microphone: `⋯ → Microphone → Virtual microphone uses host audio input`. Emulator camera can take a virtual-scene photo.
- **Permissions** are requested on first use (camera, microphone, calendar). Deny them to see the graceful fallbacks; Settings deep-links are provided.
- **Share sheet:** direct "Share to Sift" from WhatsApp needs a development build with an Android share-intent plugin. The prototype ships the reliable fallback (**Paste from clipboard**) and a deep link: `sift://share?initialText=Hello` opens the paste screen pre-filled (e.g. from Tasker / Shortcuts).
  ```bash
  adb shell am start -a android.intent.action.VIEW -d "sift://share?initialText=Kal%205%20baje%20assignment%20submit%20karna%20hai"
  ```

## 6. Architecture

```
Image adapter (camera/gallery → resize+JPEG)  ─┐
Voice adapter (mic → speech-to-text)           ─┼─►  extractActions()  ──►  strict JSON
Text adapter  (paste / share / deep link)      ─┘        │                     │
                                                          │            normalizeItems()  (validate, coerce, PRIORITY ENGINE)
                                  cloud LLM (Edge Function) │ offline extractor (fallback / Demo)
                                                                                 ▼
                                                            TasksContext → AsyncStorage cache + Supabase (RLS)
                                                                                 ▼
                                                    Inbox (URGENT/TODAY/UPCOMING) · Calendar · Digest
```

```
App.tsx · index.ts
src/
  components/   Button, TaskCard, ExtractedItemCard, TaskForm, BottomSheet, ProcessingView, TabBar …
  screens/      Onboarding, Auth, Inbox, Capture, ImageScanner, VoiceDump, SharedMessage,
                Result, TaskDetail, Calendar, Settings, Digest
  navigation/   RootNavigator (auth/onboarding gating, deep links), MainTabs
  context/      Settings, Auth, Tasks, Toast
  services/
    ai/         extractionEngine (ONE engine), remoteExtractor, localExtractor, normalize, imagePrep
    speech/     transcribe
    calendar/   calendarService (expo-calendar)
    supabase/   client, tasksRepo
    analytics.ts
  hooks/ utils/ types/ constants/ assets/
supabase/       schema.sql (tables + RLS) · functions/extract · functions/transcribe
scripts/        test-logic.ts
```

**Schema:** the AI returns `{ items: [{ type, title, description, date, time, deadline, venue, priority, people, links, source, original_text, confidence }] }`.
`title` is the normalized English title; `original_text` keeps the user's own words (Hinglish etc.).

**Priority engine** (`src/utils/priority.ts`): overdue → urgent · today + urgent words (or < 4 h left) → urgent · tomorrow → high · ≤ 7 days → medium (high if it's a registration/last date) · later → low · no date → medium for actions, low for notes. Users can override any priority.

**Date rules:** "tomorrow / kal / naale / naalai / repu" resolve against the phone's **local** date (sent to the AI with the weekday and timezone). No deadline → `deadline = null`. The AI is instructed never to invent dates or venues.

## 7. Checks you can run

```bash
npm run test:logic    # 50+ assertions: Hinglish/regional extraction, priority engine, date parsing, JSON validation
npm run typecheck     # full TypeScript check (after npm install)
```

## 8. Team

Built by a team of second-year college students as a hackathon prototype. We're still early in our app development journey — this project was as much about learning as shipping.

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| "Incompatible SDK" in Expo Go | See the SDK note in section 1 |
| Package version warnings | `npx expo install --fix` |
| Cloud AI not used | Settings → Demo Mode must be **OFF**; `.env` set; functions deployed; restart with `npx expo start -c` |
| Sign-up says "check email" | Supabase → Auth → turn off **Confirm email** |
| Calendar permission denied | Item is still saved in Sift; enable Calendar in phone Settings |
| Mic silent on emulator | Enable the virtual microphone in emulator extended controls |
