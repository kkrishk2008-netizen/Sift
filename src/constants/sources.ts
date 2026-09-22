import type { ItemType, Source } from '../types';

export const sourceMeta: Record<Source, { label: string; icon: string }> = {
  message: { label: 'Shared message', icon: 'chatbubble-ellipses-outline' },
  image: { label: 'Scanned task', icon: 'camera-outline' },
  voice: { label: 'Voice note', icon: 'mic-outline' },
  manual: { label: 'Added manually', icon: 'create-outline' },
};

export const typeMeta: Record<ItemType, { label: string; icon: string }> = {
  task: { label: 'Task', icon: 'checkmark-circle-outline' },
  event: { label: 'Event', icon: 'calendar-outline' },
  note: { label: 'Note', icon: 'document-text-outline' },
};
