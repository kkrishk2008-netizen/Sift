import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ExtractedItemCard } from '../components/ExtractedItemCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { TaskForm } from '../components/TaskForm';
import { colors, radius, type } from '../constants/theme';
import { useTasks } from '../context/TasksContext';
import { useToast } from '../context/ToastContext';
import { addToDeviceCalendar } from '../services/calendar/calendarService';
import { track } from '../services/analytics';
import type { DraftItem, Priority } from '../types';
import type { RootStackParamList } from '../types/navigation';
import { hapticSuccess } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

const ENGINE_LABEL = { ai: '🧠 Read by AI', offline: '📴 Offline understanding', demo: '🎬 Demo Mode' } as const;

export function ResultScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { addItems } = useTasks();
  const toast = useToast();
  const { result } = route.params;
  const [items, setItems] = useState<DraftItem[]>(result.items);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<DraftItem | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [calBusy, setCalBusy] = useState<number | null>(null);

  const patch = (i: number, p: Partial<DraftItem>) => setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...p } : it)));

  const addCalendar = async (i: number) => {
    setCalBusy(i);
    const res = await addToDeviceCalendar(items[i]);
    setCalBusy(null);
    if (res.ok) {
      patch(i, { calendar_event_id: res.eventId });
      hapticSuccess();
      track('calendar_added');
      toast.show('Added to your calendar 📅', 'success');
    } else {
      toast.show(res.message, 'error');
    }
  };

  const openEdit = (i: number) => {
    setEditIndex(i);
    setEditDraft(items[i]);
    setTitleError(null);
  };
  const saveEdit = () => {
    if (!editDraft || editIndex === null) return;
    if (!editDraft.title.trim()) {
      setTitleError('Give it a title.');
      return;
    }
    patch(editIndex, { ...editDraft, title: editDraft.title.trim() });
    setEditIndex(null);
    setEditDraft(null);
  };

  const saveAll = () => {
    if (!items.length) return;
    addItems(items);
    hapticSuccess();
    toast.show(items.length === 1 ? 'Saved to your inbox ✓' : `${items.length} actions saved to your inbox ✓`, 'success');
    navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Inbox' } }] });
  };

  const title = items.length === 1 ? '✨ I found an action' : `✨ I found ${items.length} actions`;

  return (
    <View style={styles.root}>
      <ScreenHeader title={items.length ? title : 'Nothing left'} onBack={() => navigation.goBack()} closeIcon />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        <View style={styles.badges}>
          <View style={styles.engine}><Text style={styles.engineText}>{ENGINE_LABEL[result.engine]}</Text></View>
        </View>

        {result.notice ? (
          <View style={styles.notice}><Text style={styles.noticeText}>{result.notice}</Text></View>
        ) : null}

        {result.transcript ? (
          <View style={styles.transcript}>
            <Text style={styles.transcriptLabel}>🎙 What you said</Text>
            <Text style={styles.transcriptText}>“{result.transcript}”</Text>
          </View>
        ) : null}

        {items.length === 0 ? (
          <EmptyState emoji="🗑" title="You removed everything" message="Go back and capture something else." actionLabel="Back to Capture" onAction={() => navigation.goBack()} />
        ) : (
          items.map((it, i) => (
            <ExtractedItemCard
              key={`${i}-${it.title}`}
              item={it}
              onPriority={(p: Priority) => patch(i, { priority: p })}
              onEdit={() => openEdit(i)}
              onRemove={items.length > 1 ? () => setItems((prev) => prev.filter((_, idx) => idx !== i)) : undefined}
              onCalendar={() => addCalendar(i)}
              calendarBusy={calBusy === i}
            />
          ))
        )}
      </ScrollView>

      {items.length > 0 ? (
        <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
          <Button label={items.length === 1 ? 'Save to Inbox' : `Save ${items.length} to Inbox`} icon="file-tray-full" onPress={saveAll} />
        </View>
      ) : null}

      <BottomSheet visible={editIndex !== null} onClose={() => setEditIndex(null)} title="Edit" tall>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
          {editDraft ? <TaskForm value={editDraft} onChange={(p) => setEditDraft((d) => (d ? { ...d, ...p } : d))} titleError={titleError} /> : null}
          <Button label="Save changes" icon="checkmark" onPress={saveEdit} style={{ marginTop: 20 }} />
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  badges: { flexDirection: 'row', marginBottom: 12 },
  engine: { backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  engineText: { fontSize: 13, fontWeight: '800', color: colors.primaryDeep },
  notice: { backgroundColor: '#FFF6DD', padding: 14, borderRadius: radius.md, marginBottom: 14 },
  noticeText: { fontSize: 14, lineHeight: 20, color: '#6B4A00', fontWeight: '600' },
  transcript: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginBottom: 16 },
  transcriptLabel: { fontSize: 13, fontWeight: '800', color: colors.primary, marginBottom: 6 },
  transcriptText: { ...type.body, fontStyle: 'italic' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'rgba(243,244,251,0.96)', borderTopWidth: 1, borderTopColor: colors.line },
});
