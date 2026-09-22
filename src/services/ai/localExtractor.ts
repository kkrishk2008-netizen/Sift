/**
 * Offline / demo extractor.
 *
 * A deterministic, rule-based understanding of English, Hinglish and a few
 * regional-language cue words. It powers Demo Mode and is the safety net when
 * the cloud AI is unreachable, so the demo never dead-ends.
 * It returns items in the SAME schema as the cloud AI; priority is finalized later
 * by the shared normalizer, exactly like AI output.
 */
import type { ExtractedItem, ItemType, Source } from '../../types';
import { addDays, combineLocal, pad2, startOfDay, toYMD } from '../../utils/date';
import { IMPORTANT_RE, URGENT_RE } from '../../utils/priority';

// ---------------------------------------------------------------------------
// tiny regex helpers (avoid \b and lookbehind so Indic scripts and Hermes are safe)
// ---------------------------------------------------------------------------
const WC = 'A-Za-z0-9_\\u0900-\\u0D7F';
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function wordRe(words: string[]): RegExp {
  const alt = [...words].sort((a, b) => b.length - a.length).map(escapeRe).join('|');
  return new RegExp(`(^|[^${WC}])(${alt})(?![${WC}])`, 'i');
}

const TOMORROW = wordRe([
  'tomorrow', 'tmrw', 'tmr', 'kal', 'naale', 'naalai', 'repu', 'nale',
  'कल', 'നാളെ', 'நாளை', 'రేపు', 'ನಾಳೆ',
]);
const DAY_AFTER = wordRe(['day after tomorrow', 'parso', 'parson', 'परसों', 'മറ്റന്നാൾ']);
const TODAY = wordRe([
  'today', 'tonight', 'aaj', 'innu', 'inniku', 'indu', 'ivvala',
  'आज', 'ഇന്ന്', 'இன்று', 'ఈరోజు', 'ಇಂದು',
]);

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5, saturday: 6, sat: 6,
  ravivar: 0, somvar: 1, mangalvar: 2, budhvar: 3, guruvar: 4, veervar: 4, shukravar: 5, shanivar: 6,
  'रविवार': 0, 'सोमवार': 1, 'मंगलवार': 2, 'बुधवार': 3, 'गुरुवार': 4, 'शुक्रवार': 5, 'शनिवार': 6,
};
const WEEKDAY_RE = wordRe(Object.keys(WEEKDAYS));

const MONTHS: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3, may: 4,
  june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7, september: 8, sept: 8, sep: 8,
  october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
};
const MONTH_ALT = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
const DM_RE = new RegExp(
  `(^|[^A-Za-z0-9])(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s+)?(${MONTH_ALT})(?![A-Za-z])(?:\\s*,?\\s*(\\d{4}))?`,
  'i',
);
const MD_RE = new RegExp(
  `(^|[^A-Za-z0-9])(${MONTH_ALT})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?![\\d:])(?!\\s*(?:am|pm))(?:\\s*,?\\s*(\\d{4}))?`,
  'i',
);

const PM_WORDS = wordRe(['shaam', 'sham', 'evening', 'raat', 'night', 'dopahar', 'afternoon', 'tonight', 'शाम', 'रात']);
const AM_WORDS = wordRe(['subah', 'morning', 'savere', 'सुबह']);

const T_AMPM = /(^|[^\d:])(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?(?![A-Za-z])/i;
const T_BAJE = /(^|[^\d:])(\d{1,2})(?::(\d{2}))?\s*(?:baje|bje|baj|mani|gante|gantalaku|o'?clock|बजे|മണി|மணி|గంటలకు|ಗಂಟೆ)(?![A-Za-z])/i;
const T_24 = /(^|[^\d])([01]?\d|2[0-3]):([0-5]\d)(?!\d)/;
const T_AT = /(^|[^A-Za-z0-9])(?:at|@|by|before)\s+(\d{1,2})(?::(\d{2}))?(?![\d/:.-]|\s*(?:st|nd|rd|th|am|pm)(?![A-Za-z]))/i;

function buildDate(day: number, monthIdx: number | undefined, year: number | undefined, today: Date): Date | null {
  if (monthIdx === undefined || day < 1 || day > 31) return null;
  let y = year ?? today.getFullYear();
  let d = new Date(y, monthIdx, day);
  if (d.getMonth() !== monthIdx || d.getDate() !== day) return null;
  if (year === undefined && d.getTime() < addDays(today, -60).getTime()) {
    y += 1;
    d = new Date(y, monthIdx, day);
  }
  return d;
}

export interface When {
  date: Date | null;
  time: string | null;
  /** input with the matched date/time phrases removed */
  rest: string;
}

/** Understands: tomorrow / kal / naale / Friday / 25 September / 25/09 / 5 pm / 5 baje / 17:30 ... */
export function parseWhen(input: string, now: Date): When {
  let work = ` ${input} `;
  let date: Date | null = null;
  let time: string | null = null;
  let weekday: number | null = null;
  const today = startOfDay(now);

  // --- date ---
  let m = /(^|[^\d])(\d{4})-(\d{2})-(\d{2})(?!\d)/.exec(work);
  if (m) {
    const d = new Date(+m[2], +m[3] - 1, +m[4]);
    if (!isNaN(d.getTime())) {
      date = d;
      work = work.replace(m[0], `${m[1]} `);
    }
  }
  if (!date && (m = DM_RE.exec(work))) {
    const d = buildDate(+m[2], MONTHS[m[3].toLowerCase()], m[4] ? +m[4] : undefined, today);
    if (d) {
      date = d;
      work = work.replace(m[0], `${m[1]} `);
    }
  }
  if (!date && (m = MD_RE.exec(work))) {
    const d = buildDate(+m[3], MONTHS[m[2].toLowerCase()], m[4] ? +m[4] : undefined, today);
    if (d) {
      date = d;
      work = work.replace(m[0], `${m[1]} `);
    }
  }
  if (!date) {
    const re = /(^|[^\d:.])(\d{1,2})([/-])(\d{1,2})(?:\3(\d{2,4}))?(?![\d:])/g;
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(work))) {
      const dd = +mm[2];
      const mo = +mm[4];
      if (dd >= 1 && dd <= 31 && mo >= 1 && mo <= 12) {
        let y = mm[5] ? +mm[5] : undefined;
        if (y !== undefined && y < 100) y += 2000;
        const d = buildDate(dd, mo - 1, y, today);
        if (d) {
          date = d;
          work = work.replace(mm[0], `${mm[1]} `);
          break;
        }
      }
    }
  }
  if (!date) {
    if (DAY_AFTER.test(work)) {
      date = addDays(today, 2);
      work = work.replace(DAY_AFTER, '$1 ');
    } else if (TOMORROW.test(work)) {
      date = addDays(today, 1);
      work = work.replace(TOMORROW, '$1 ');
    } else if (TODAY.test(work)) {
      date = addDays(today, 0);
      work = work.replace(TODAY, '$1 ');
    }
  }
  if (!date) {
    const wm = WEEKDAY_RE.exec(work);
    if (wm) {
      weekday = WEEKDAYS[wm[2].toLowerCase()] ?? WEEKDAYS[wm[2]];
      work = work.replace(WEEKDAY_RE, '$1 ');
    }
  }

  // --- time ---
  const period: 'am' | 'pm' | null = PM_WORDS.test(work) ? 'pm' : AM_WORDS.test(work) ? 'am' : null;
  const conv = (h: number, mi: number, ap?: 'am' | 'pm', explicit24 = false): string | null => {
    if (mi > 59) return null;
    if (ap) {
      if (h < 1 || h > 12) return null;
      if (ap === 'pm' && h < 12) h += 12;
      if (ap === 'am' && h === 12) h = 0;
    } else if (!explicit24) {
      if (h > 12 || h < 1) return null;
      if (period === 'pm' && h < 12) h += 12;
      else if (period === 'am' && h === 12) h = 0;
      else if (!period && h >= 1 && h <= 6) h += 12; // "5 baje" almost always means 5 PM
    } else if (h > 23) return null;
    return `${pad2(h)}:${pad2(mi)}`;
  };

  let tm: RegExpExecArray | null;
  if ((tm = T_AMPM.exec(work))) {
    time = conv(+tm[2], tm[3] ? +tm[3] : 0, tm[4].toLowerCase() === 'a' ? 'am' : 'pm');
    if (time) work = work.replace(tm[0], `${tm[1]} `);
  }
  if (!time && (tm = T_BAJE.exec(work))) {
    time = conv(+tm[2], tm[3] ? +tm[3] : 0);
    if (time) work = work.replace(tm[0], `${tm[1]} `);
  }
  if (!time && (tm = T_24.exec(work))) {
    time = conv(+tm[2], +tm[3], undefined, true);
    if (time) work = work.replace(tm[0], `${tm[1]} `);
  }
  if (!time && (tm = T_AT.exec(work))) {
    time = conv(+tm[2], tm[3] ? +tm[3] : 0);
    if (time) work = work.replace(tm[0], `${tm[1]} `);
  }
  if (time && period) {
    work = work.replace(period === 'pm' ? PM_WORDS : AM_WORDS, '$1 ');
  }

  if (weekday !== null) {
    let offset = (weekday - today.getDay() + 7) % 7;
    if (offset === 0 && time) {
      const at = combineLocal(toYMD(today), time);
      if (at && at.getTime() < now.getTime()) offset = 7;
    }
    date = addDays(today, offset);
  }

  return { date, time, rest: work.replace(/\s+/g, ' ').trim() };
}

// ---------------------------------------------------------------------------
// text helpers
// ---------------------------------------------------------------------------
const URL_RE = /(?:https?:\/\/|www\.)[^\s<>()"']+/gi;
const VENUE_LABEL = /^\s*(?:venue|location|loc|place|where)\s*[:\-–]\s*(.+?)\s*$/i;
const INLINE_VENUE = /\b(?:venue|location|place)\s*[:\-–]\s*([^,;.\n]+)/i;
const PLACE_WORDS =
  '(?:(?:innovation|computer|ai|ml|ds|physics|chemistry|electronics|main|mini|seminar|conference|smart)\\s+)?' +
  '(?:seminar hall|auditorium|lab\\s*\\d+[a-z]?|(?:innovation|computer|ai|ml|ds|physics|chemistry|electronics)\\s+lab|hall\\s*\\d*|room\\s*\\d+[a-z]?|classroom\\s*\\d*|library|canteen|cafeteria|block\\s*[a-z0-9]+|ground|campus|cabin\\s*\\d*|conference room)';
const IN_PLACE = new RegExp(`\\b(?:in|at|@|to|near|outside)\\s+(?:the\\s+)?(${PLACE_WORDS})(?![A-Za-z])`, 'i');
const PLACE_LINE = new RegExp(`^\\s*(?:the\\s+)?${PLACE_WORDS}\\s*[.!]?\\s*$`, 'i');

const NOISE_WORDS = new Set([
  'guys', 'guy', 'hi', 'hello', 'hey', 'dear', 'all', 'everyone', 'everybody', 'students', 'friends', 'team',
  'reminder', 'note', 'notice', 'attention', 'important', 'urgent', 'fyi', 'gm', 'good', 'morning', 'evening',
  'afternoon', 'please', 'pls', 'kindly', 'thanks', 'thank', 'you', 'regards', 'sir', 'mam', 'madam', 'ok', 'okay',
  'forwarded', 'message', 'many', 'times', 'as',
  'it', 'is', 'very', 'this', 'that', 'needed', 'required', 'be', 'super', 'extremely', 'really', 'highly', 'so',
]);

function isNoise(clause: string): boolean {
  const words = clause.replace(/[^A-Za-z\u0900-\u0D7F\s]/g, ' ').toLowerCase().split(/\s+/).filter(Boolean);
  return words.length === 0 || words.every((w) => NOISE_WORDS.has(w));
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const titleCase = (s: string) =>
  s.replace(/\b([a-z][a-z'’]*)\b/g, (w) => (['of', 'the', 'and', 'for', 'to', 'in', 'at', 'on'].includes(w) ? w : cap(w)));
const properName = (s: string) =>
  s.trim().split(/\s+/).map((w) => (w === w.toUpperCase() && w.length > 1 ? w : cap(w.toLowerCase()))).join(' ');

function normalizeOrg(s: string): string {
  return s
    .replace(/google developer student clubs?/i, 'GDSC')
    .replace(/google developer groups?/i, 'GDG');
}

const WHO_MAP: Record<string, string> = {
  sir: 'professor', sirr: 'professor', prof: 'professor', professor: 'professor',
  mam: 'professor', maam: 'professor', madam: 'professor', "ma'am": 'professor',
};
const normWho = (raw: string): string => {
  const k = raw.trim().toLowerCase();
  return WHO_MAP[k] ?? properName(raw);
};

const LEAD_FILLER = /^(?:(?:guys|guy|everyone|everybody|please|pls|kindly|also|and|aur|phir|fir|ok|okay|hey|hi|hello|btw|yaar|bhai|reminder)\b[\s,:!\-–]*)+/i;
const LEAD_PREP = /^(?:(?:on|at|by|before|till|until|from|ko|tak|se|pe|par|ke|this|next|coming|is|the)\b[\s,:!\-–]*)+/i;
const TRAIL = /(?:[\s,:!\-–]*\b(?:karna|karni|karo|kardo|karein|karenge|krna|hai|h|hain|hoga|hogi|hona|chahiye|undu|und|irukku|undi|ide|only|pls|please|yaar|bhai|na|okay|ok|by|at|on|before|till|until|ko|tak|se|pe|par|ke))+[\s.!?,]*$/i;

function trimLead(s: string): string {
  let cur = s.trim();
  let prev: string;
  do {
    prev = cur;
    cur = cur.replace(LEAD_FILLER, '').replace(LEAD_PREP, '').trim();
    cur = cur.replace(/^[\s,.:;!\-–]+/, '');
  } while (cur !== prev);
  return cur;
}
function trimFiller(s: string): string {
  let cur = s.trim();
  let prev: string;
  do {
    prev = cur;
    cur = trimLead(cur).replace(TRAIL, '').trim();
    cur = cur.replace(/[\s,.:;!\-–]+$/, '');
  } while (cur !== prev);
  return cur;
}

const VERBS =
  'submit|jama|complete|finish|upload|pay|fill|prepare|book|review|revise|study|register|apply|email|call|buy|print|read|check|attend|meet|send|collect|carry|bring|renew|update|clean|practice|prep';
const OBJ_VERB = new RegExp(`^(.+?)\\s+(${VERBS})\\s+(?:karna|karni|karo|kardo|kar\\s*dena|kar\\s*lena|karein|karenge|krna)(?![A-Za-z])`, 'i');
const SEND_TO =
  /^(.+?)\s+ko\s+(.+?)\s+(?:bhi\s+)?(bhejna|bhej\s*dena|bhej\s*do|bhejo|dena|de\s*dena|de\s*do|send\s*karna|send\s*karo|forward\s*karna)(?![A-Za-z])/i;
const CONTACT = /^(.+?)\s+ko\s+(call|phone|message|msg|text|email|mail|remind)(?![A-Za-z])/i;
const WITH_HI = /^(.+?)\s+(?:ke\s+)?(?:saath|sath|se)\s+(meeting|call|discussion|interview|viva|review|lunch|dinner|catch\s*up)(?![A-Za-z])/i;
const WITH_EN = /^(meeting|call|discussion|interview|viva|catch\s*up)\s+with\s+(.+)$/i;

const TASK_VERBS =
  'submit|send|bring|carry|pay|complete|finish|upload|fill|register|apply|buy|collect|print|email|call|reply|prepare|revise|study|update|book|renew|share|forward|remind|return|download|install|clean|write|read|check|fix|make|create|order|pick|drop|give|take|attend|jama';
const TASK_START = new RegExp(`^(?:${TASK_VERBS})(?![A-Za-z])`, 'i');
const EVENT_RE =
  /\b(meeting|workshop|seminar|webinar|hackathon|fest|festival|contest|competition|conference|orientation|session|lecture|class|exam|test|viva|interview|party|event|talk|drive|presentation|demo|standup|review|summit|meetup|bootcamp|quiz|tournament|match|techfest|\w+athon)\b/i;
const BRING = /^(?:(?:also|and|aur|please|pls)\s+)*(bring|carry|get|take)\b\s*(.*)$/i;
const DEADLINE_LINE =
  /\b(register|registration|apply|applications?|last date|last day|deadline|closes|closing|close|before|submit(?:ted)? by|till|until|rsvp|sign ?up|enrol)\b/i;

function cleanObj(o: string): string {
  return o
    .replace(/\s+(?:ka|ki|ke)\s+/gi, ' ')
    .replace(/^(?:the|a|an|apna|apni|apne|your|my|our)\s+/i, '')
    .replace(/\s+bhi$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface TitleResult {
  title: string;
  people: string[];
  kind: 'task' | 'event' | null; // null = decide from keywords
}

function buildTitle(restIn: string): TitleResult {
  const s = trimLead(
    restIn.replace(/\b(moved|shifted|rescheduled|postponed|preponed)\b(\s+to)?/gi, ' ').replace(/\s+/g, ' '),
  );
  let m: RegExpExecArray | null;

  if ((m = SEND_TO.exec(s))) {
    const verbRaw = m[3].toLowerCase();
    const verb = /bhej|send/.test(verbRaw) ? 'Send' : /forward/.test(verbRaw) ? 'Forward' : 'Give';
    const who = normWho(m[1]);
    return { title: `${verb} ${cleanObj(m[2])} to ${who}`, people: [who], kind: 'task' };
  }
  if ((m = CONTACT.exec(s))) {
    const v = m[2].toLowerCase();
    const verb = /call|phone/.test(v) ? 'Call' : /message|msg|text/.test(v) ? 'Message' : /mail/.test(v) ? 'Email' : 'Remind';
    const who = normWho(m[1]);
    return { title: `${verb} ${who}`, people: [who], kind: 'task' };
  }
  if ((m = OBJ_VERB.exec(s))) {
    const v = m[2].toLowerCase();
    const verb = v === 'jama' ? 'Submit' : cap(v);
    return { title: `${verb} ${cleanObj(m[1].replace(/\s+ko$/i, ''))}`, people: [], kind: 'task' };
  }
  if ((m = WITH_HI.exec(s))) {
    const who = normWho(m[1]);
    return { title: `${cap(m[2].toLowerCase())} with ${who}`, people: [who], kind: 'event' };
  }
  if ((m = WITH_EN.exec(trimFiller(s)))) {
    const who = normWho(m[2]);
    return { title: `${cap(m[1].toLowerCase())} with ${who}`, people: [who], kind: 'event' };
  }

  let t = trimFiller(s)
    .replace(/\b(?:the|your)\s+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  t = normalizeOrg(t);
  const people: string[] = [];
  const pm = /\b(?:with|to|from)\s+([A-Z][a-z]{2,})\b/.exec(t);
  if (pm) people.push(pm[1]);
  if (!t) t = s.split(/\s+/).slice(0, 6).join(' ');
  if (t.length > 70) t = `${t.slice(0, 67).trimEnd()}…`;
  return { title: cap(t), people, kind: null };
}

// ---------------------------------------------------------------------------
// clause splitting
// ---------------------------------------------------------------------------
const PREDICATE_END = /\b(?:hai|hain|hoga|hogi|karna|karni|karo|dena|bhejna|jana|h|undu|und|irukku|undi|ide)\s*$/i;

function splitClauses(text: string): string[] {
  const sentences = text
    .replace(/\r/g, '\n')
    .replace(/([.!?।]+)(\s+|$)/g, '$1\u0000')
    .split(/[\u0000\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: string[] = [];
  for (const sentence of sentences) {
    for (const part of sentence.split(/\s*,?\s+(?:aur|phir|fir|also|plus|and then)\s+/i)) {
      const pieces = part.split(/\s*,\s*/).filter(Boolean);
      if (!pieces.length) continue;
      let cur = pieces[0];
      for (let i = 1; i < pieces.length; i++) {
        const next = pieces[i];
        if (PREDICATE_END.test(cur) || TASK_START.test(trimLead(next))) {
          out.push(cur);
          cur = next;
        } else {
          cur = `${cur}, ${next}`;
        }
      }
      out.push(cur);
    }
  }
  return out.map((c) => c.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// drafts
// ---------------------------------------------------------------------------
interface Draft {
  type: ItemType;
  title: string;
  description: string;
  date: Date | null;
  time: string | null;
  deadline: Date | null;
  venue: string | null;
  people: string[];
  links: string[];
  original: string;
  confidence: number;
}

function cleanVenue(v: string): string {
  return v.replace(/[.!\s]+$/, '').replace(/^the\s+/i, '').trim();
}

function extractLinks(s: string): string[] {
  return (s.match(URL_RE) ?? []).map((u) => u.replace(/[.,;!?)]+$/, ''));
}

function tryBlock(lines: string[], now: Date, fullText: string): Draft | null {
  if (lines.length < 2) return null;
  const first = lines[0];
  const fw = parseWhen(first, now);
  if (fw.date || fw.time) return null;
  if (first.split(/\s+/).length > 9) return null;
  if (!(EVENT_RE.test(first) || /\b(19|20)\d{2}\b/.test(first))) return null;
  if (TASK_START.test(trimLead(first))) return null;

  let venue: string | null = null;
  let eventDate: Date | null = null;
  let eventTime: string | null = null;
  let deadlineDate: Date | null = null;
  let deadlineTime: string | null = null;
  const deadlineLines: string[] = [];
  const extra: string[] = [];

  for (const line of lines.slice(1)) {
    const vl = VENUE_LABEL.exec(line);
    if (vl) {
      // "Venue: Innovation Lab 6 PM" -> pull a trailing time out of the venue text
      const w = parseWhen(vl[1], now);
      venue = cleanVenue(w.time ? w.rest : vl[1]);
      if (w.time && !eventTime) eventTime = w.time;
      continue;
    }
    if (PLACE_LINE.test(line)) {
      venue = venue ?? titleCase(cleanVenue(line));
      continue;
    }
    const w = parseWhen(line, now);
    if (DEADLINE_LINE.test(line)) {
      deadlineLines.push(line.replace(/[.!\s]+$/, ''));
      if (w.date && !deadlineDate) deadlineDate = w.date;
      if (w.time && !deadlineTime) deadlineTime = w.time;
      continue;
    }
    if (w.date && !eventDate) {
      eventDate = w.date;
      if (w.time && !eventTime) eventTime = w.time;
      continue;
    }
    if (w.time && !w.date && !eventTime && w.rest.length < 3) {
      eventTime = w.time;
      continue;
    }
    if (isNoise(line)) continue;
    extra.push(line.replace(/[.!\s]+$/, ''));
  }

  if (!eventDate && !deadlineDate && !venue) return null;

  if (!eventDate && deadlineDate) {
    eventDate = deadlineDate;
    if (!eventTime && deadlineTime) eventTime = deadlineTime;
  }
  let deadline: Date | null = null;
  if (deadlineDate) {
    const sameDay = eventDate ? toYMD(eventDate) === toYMD(deadlineDate) : false;
    const t = deadlineTime ?? (sameDay ? eventTime : null) ?? '23:59';
    deadline = combineLocal(toYMD(deadlineDate), t);
  }

  return {
    type: 'event',
    title: titleCase(normalizeOrg(first.replace(/[.!\s]+$/, ''))),
    description: [...deadlineLines, ...extra].join('\n'),
    date: eventDate,
    time: eventTime,
    deadline,
    venue,
    people: [],
    links: extractLinks(fullText),
    original: fullText.trim(),
    confidence: 0.72,
  };
}

function toItem(d: Draft, source: Source, now: Date): ExtractedItem {
  let deadline = d.deadline;
  if (!deadline && d.type === 'task' && d.date) deadline = combineLocal(toYMD(d.date), d.time, '23:59');
  const description =
    d.description || (d.original && d.original.trim().toLowerCase() !== d.title.toLowerCase() ? d.original.trim() : '');
  return {
    type: d.type,
    title: d.title,
    description,
    date: d.date ? toYMD(d.date) : null,
    time: d.time,
    deadline: deadline ? deadline.toISOString() : null,
    venue: d.venue,
    priority: 'medium',
    people: Array.from(new Set(d.people)),
    links: Array.from(new Set(d.links)),
    source,
    original_text: d.original,
    confidence: Math.min(0.85, d.confidence + (d.date ? 0.05 : 0)),
  };
}

/** Public entry: text -> items (unfinalized: priority is set by the shared normalizer). */
export function localExtract(text: string, source: Source, now: Date = new Date()): ExtractedItem[] {
  const full = (text ?? '').trim();
  if (!full) return [];
  const lines = full.split(/\n+/).map((l) => l.trim()).filter((l) => l && !isNoise(l));

  const block = tryBlock(lines, now, full);
  if (block) return [toItem(block, source, now)];

  const drafts: Draft[] = [];
  const lastActionable = (): Draft | undefined => {
    for (let i = drafts.length - 1; i >= 0; i--) if (!drafts[i].title.startsWith('Bring ')) return drafts[i];
    return drafts[drafts.length - 1];
  };

  const flags: string[] = []; // e.g. "It is urgent" – noise on its own, but it colours every item
  for (const rawClause of splitClauses(full)) {
    if (isNoise(rawClause)) {
      if (URGENT_RE.test(rawClause) || IMPORTANT_RE.test(rawClause)) flags.push(rawClause);
      continue;
    }

    const vl = VENUE_LABEL.exec(rawClause);
    if (vl) {
      const target = lastActionable() ?? drafts[0];
      if (target) target.venue = cleanVenue(vl[1]);
      continue;
    }

    // links
    const links = extractLinks(rawClause);
    let clause = rawClause.replace(URL_RE, ' ').replace(/\s+/g, ' ').trim();
    if (links.length && (isNoise(clause) || clause.split(/\s+/).length <= 3)) {
      const target = lastActionable() ?? drafts[0];
      if (target) target.links.push(...links);
      if (target || !clause) continue;
    }
    if (!clause) continue;

    // inline venue
    let venue: string | null = null;
    const iv = INLINE_VENUE.exec(clause);
    if (iv) {
      venue = cleanVenue(iv[1]);
      clause = clause.replace(iv[0], ' ').replace(/\s+/g, ' ').trim();
    }

    const bring = BRING.exec(clause);
    if (bring && bring[2].trim()) {
      const what = cleanObj(bring[2].replace(/[.!]+$/, '').replace(/\b(?:your|the)\s+/gi, ''));
      const prev = lastActionable();
      if (prev && prev.type === 'event') {
        drafts.push({
          type: 'task',
          title: `Bring ${what}`,
          description: `For: ${prev.title}`,
          date: prev.date,
          time: prev.time,
          deadline: null,
          venue: prev.venue,
          people: [],
          links: [],
          original: rawClause,
          confidence: 0.7,
        });
      } else if (prev) {
        prev.description = [prev.description || prev.original, cap(clause.replace(/^(?:also|and|aur)\s+/i, ''))]
          .filter(Boolean)
          .join(' ');
        prev.original = `${prev.original} ${rawClause}`.trim();
      } else {
        drafts.push({
          type: 'task', title: `Bring ${what}`, description: '', date: null, time: null, deadline: null,
          venue: null, people: [], links: [], original: rawClause, confidence: 0.6,
        });
      }
      continue;
    }

    const when = parseWhen(clause, now);
    if (!venue) {
      const pm = IN_PLACE.exec(when.rest);
      if (pm) venue = titleCase(pm[1]);
    }
    const restNoPlace = venue ? when.rest.replace(IN_PLACE, ' ').replace(/\s+/g, ' ').trim() : when.rest;
    const built = buildTitle(restNoPlace);
    if (!built.title || built.title.length < 2) continue;

    const hasDeadlineWords = DEADLINE_LINE.test(clause) && !!when.date;
    let type: ItemType;
    if (built.kind) type = built.kind;
    else if (TASK_START.test(trimLead(restNoPlace))) type = 'task';
    else if (EVENT_RE.test(built.title)) type = 'event';
    else if (when.date || when.time || hasDeadlineWords) type = 'task';
    else type = 'note';

    drafts.push({
      type,
      title: built.title,
      description: '',
      date: when.date,
      time: when.time,
      deadline: null,
      venue,
      people: built.people,
      links,
      original: rawClause,
      confidence: type === 'note' ? 0.5 : 0.68,
    });
  }

  if (drafts.length && flags.length) {
    for (const d of drafts) {
      d.description = d.description || d.original;
      d.original = `${d.original} ${flags.join(' ')}`.trim();
    }
  }

  if (!drafts.length) {
    const t = full.replace(/\s+/g, ' ');
    drafts.push({
      type: 'note',
      title: cap(t.split(' ').slice(0, 8).join(' ')),
      description: full,
      date: null, time: null, deadline: null, venue: null,
      people: [], links: extractLinks(full), original: full, confidence: 0.4,
    });
  }
  return drafts.map((d) => toItem(d, source, now));
}
