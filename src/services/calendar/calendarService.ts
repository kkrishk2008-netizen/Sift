import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import type { ExtractedItem } from '../../types';
import { combineLocal, localTimeZone } from '../../utils/date';

export type CalendarResult =
  | { ok: true; eventId: string }
  | { ok: false; reason: 'denied' | 'no_date' | 'no_calendar' | 'error'; message: string };

type CalItem = Pick<ExtractedItem, 'title' | 'description' | 'date' | 'time' | 'deadline' | 'venue' | 'type'>;

const SIFT_CAL_TITLE = 'Sift';

async function pickCalendarId(): Promise<string | null> {
  if (Platform.OS === 'ios') {
    const def = await Calendar.getDefaultCalendarAsync();
    if (def?.id) return def.id;
  }
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = cals.filter((c) => c.allowsModifications);
  const primary = writable.find((c) => (c as { isPrimary?: boolean }).isPrimary) ?? writable[0];
  if (primary) return primary.id;

  // No writable calendar on the device (common on emulators): create a local Sift calendar.
  try {
    const id = await Calendar.createCalendarAsync({
      title: SIFT_CAL_TITLE,
      color: '#5B3DF5',
      entityType: Calendar.EntityTypes.EVENT,
      source:
        Platform.OS === 'ios'
          ? ((cals.find((c) => c.source?.type === Calendar.SourceType.LOCAL)?.source ?? cals[0]?.source) as Calendar.Source)
          : { isLocalAccount: true, name: SIFT_CAL_TITLE, type: Calendar.SourceType.LOCAL } as unknown as Calendar.Source,
      name: 'sift',
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
    return id;
  } catch {
    return null;
  }
}

export async function addToDeviceCalendar(item: CalItem): Promise<CalendarResult> {
  // Start: the event's own date/time; tasks fall back to their deadline.
  const timed = item.date ? combineLocal(item.date, item.time, '09:00') : null;
  const start = timed ?? (item.deadline ? new Date(item.deadline) : null);
  if (!start || isNaN(start.getTime())) {
    return { ok: false, reason: 'no_date', message: 'This item has no date yet. Add one first.' };
  }
  const allDay = !!item.date && !item.time && item.type !== 'task';
  const minutes = item.type === 'event' ? 60 : 30;
  const end = new Date(start.getTime() + minutes * 60_000);

  try {
    const perm = await Calendar.requestCalendarPermissionsAsync();
    if (perm.status !== 'granted') {
      return {
        ok: false,
        reason: 'denied',
        message: 'Calendar access was denied. It is still saved in Sift.',
      };
    }
    const calendarId = await pickCalendarId();
    if (!calendarId) {
      return { ok: false, reason: 'no_calendar', message: 'No calendar available on this device.' };
    }
    const notes = [item.description, item.type === 'task' ? 'Added from Sift' : 'Added from Sift']
      .filter(Boolean)
      .join('\n\n');
    const eventId = await Calendar.createEventAsync(calendarId, {
      title: item.title,
      startDate: start,
      endDate: allDay ? new Date(start.getTime() + 24 * 3_600_000) : end,
      allDay,
      location: item.venue ?? undefined,
      notes,
      timeZone: localTimeZone(),
      alarms: [{ relativeOffset: -60 }],
    });
    return { ok: true, eventId };
  } catch (e) {
    return { ok: false, reason: 'error', message: 'Could not add to the calendar. It is still saved in Sift.' };
  }
}
