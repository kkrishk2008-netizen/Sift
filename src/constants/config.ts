// Client-side config. Only PUBLIC values live here (Supabase URL + anon key).
// Secret keys (AI_API_KEY, SPEECH_API_KEY) are server-side only: see supabase/functions.
export const SUPABASE_URL: string = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY: string = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const IS_SUPABASE_CONFIGURED =
  SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 20;

export const GEMINI_API_KEY: string = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
export const IS_GEMINI_CONFIGURED: boolean = GEMINI_API_KEY.length > 20;

export const APP_NAME = 'Sift';
export const TAGLINE = 'An AI inbox that turns anything into an action.';

export const AI_TIMEOUT_MS = 60_000;
export const MAX_IMAGE_WIDTH = 1280;
export const IMAGE_QUALITY = 0.7;
