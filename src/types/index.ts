export type ItemType = 'task' | 'event' | 'note';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type Source = 'image' | 'voice' | 'message' | 'manual';
export type TaskStatus = 'open' | 'done';

/** Exactly the schema the AI extraction engine returns for each item. */
export interface ExtractedItem {
  type: ItemType;
  title: string; // normalized English title
  description: string;
  date: string | null; // YYYY-MM-DD (when it happens / is due)
  time: string | null; // HH:mm (24h)
  deadline: string | null; // ISO datetime (when the action must be done by)
  venue: string | null;
  priority: Priority;
  people: string[];
  links: string[];
  source: Source;
  original_text: string; // what the person actually said / wrote / the poster text
  confidence: number; // 0..1
}

/** An extracted item that may already carry a device-calendar event id. */
export interface DraftItem extends ExtractedItem {
  calendar_event_id?: string | null;
}

/** A saved inbox entry (row in the `tasks` table). */
export interface Task extends ExtractedItem {
  id: string;
  user_id: string | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  calendar_event_id: string | null;
}

export type ExtractionEngine = 'ai' | 'offline' | 'demo';

export interface ExtractionResult {
  items: DraftItem[];
  engine: ExtractionEngine;
  transcript?: string;
  notice?: string;
}

export type ExtractionInput =
  | { kind: 'text'; text: string; source: Source }
  | { kind: 'image'; base64: string; mime: string; source: 'image' };

export type ExtractionErrorCode =
  | 'empty'
  | 'network'
  | 'ai_failed'
  | 'malformed'
  | 'no_actions'
  | 'invalid_image'
  | 'timeout';

export class ExtractionError extends Error {
  code: ExtractionErrorCode;
  constructor(code: ExtractionErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ExtractionError';
    this.code = code;
  }
}
