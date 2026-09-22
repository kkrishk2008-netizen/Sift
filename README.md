# Sift 🧠📥

### An AI inbox that turns anything into an action.

Sift is a mobile app for Indian students and first-job professionals whose deadlines arrive as posters, WhatsApp messages, screenshots and voice notes — in a mix of English, Hinglish and regional languages. Instead of retyping all of that into a to-do app, you snap a poster, speak a messy voice note, or paste a chaotic group message, and Sift turns it into a structured, prioritized action.

```
Scan a Task / Voice note / WhatsApp message  →  AI extraction  →  Prioritized inbox  →  Calendar
```

Built with **React Native (Expo) + TypeScript** and **Supabase** (Postgres with row-level security), with a multimodal LLM behind the scenes. **Works with zero setup in Demo Mode** — no API keys needed to try it. Add Supabase + AI keys to switch on the live AI pipeline.

## ✨ Highlights

- **One extraction engine, three inputs** — a poster photo, a voice note, or a pasted message all flow through the same AI pipeline into the same structured schema.
- **Understands Hinglish and regional languages** — English, Hindi, Hinglish, Malayalam, Tamil, Telugu and Kannada cue words, with the original text preserved alongside a normalized English title.
- **One voice note → several tasks** — "Kal 5 baje assignment submit karna hai, Ravi ko PPT bhejna hai, aur Friday ko meeting hai" becomes three separate, dated actions.
- **A priority engine, not just a to-do list** — deadline proximity and urgency words (urgent, ASAP, last date) automatically sort items into Urgent / Today / Upcoming.
- **One-tap calendar add**, offline-first local storage, and a demo mode that works with no backend at all.

 Enable Calendar in phone Settings | Mic silent on emulator | Enable the virtual microphone in emulator extended controls 
