import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { TaskForm } from '../components/TaskForm';
import { colors } from '../constants/theme';
import { useTasks } from '../context/TasksContext';
import { useToast } from '../context/ToastContext';
import { track } from '../services/analytics';
import { addToDeviceCalendar } from '../services/calendar/calendarService';
import type { DraftItem, Task } from '../types';
import type { RootStackParamList } from '../types/navigation';
import { hapticSuccess, hapticWarning } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskDetail'>;

const blank = (draft?: Partial<DraftItem>): DraftItem => ({
  type: 'task',
  title: '',
  description: '',
  date: null,
  time: null,
  deadline: null,
  venue: null,
  priority: 'medium',
  people: [],
  links: [],
  source: 'manual',
  original_text: '',
  confidence: 1,
  calendar_event_id: null,
  ...draft,
});

const toDraft = (t: Task): DraftItem => ({ ...t });

export function TaskDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { getTask, addItems, updateTask, removeTask, toggleDone } = useTasks();
  const id = route.params?.id;
  const existing = id ? getTask(id) : undefined;

  const [form, setForm] = useState<DraftItem>(() => (existing ? toDraft(existing) : blank(route.params?.draft)));
  const [titleError, setTitleError] = useState<string | null>(null);
  const [calBusy, setCalBusy] = useState(false);

  if (id && !existing) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Not found" onBack={() => navigation.goBack()} closeIcon />
        <EmptyState emoji="🫥" title="This item is gone" message="It may have been deleted." actionLabel="Close" onAction={() => navigation.goBack()} />
      </View>
    );
  }

  const change = (p: Partial<DraftItem>) => {
    setForm((f) => ({ ...f, ...p }));
    if (p.title !== undefined) setTitleError(null);
  };

  const save = () => {
    if (!form.title.trim()) {
      setTitleError('Give it a title.');
      return;
    }
    const clean: DraftItem = { ...form, title: form.title.trim() };
    if (existing) {
      const { calendar_event_id, ...rest } = clean;
      updateTask(existing.id, { ...rest, ...(calendar_event_id !== undefined ? { calendar_event_id } : {}) });
      toast.show('Changes saved', 'success');
    } else {
      addItems([clean]);
      toast.show('Added to your inbox ✓', 'success');
    }
    hapticSuccess();
    navigation.goBack();
  };

  const calendar = async () => {
    setCalBusy(true);
    const res = await addToDeviceCalendar(form);
    setCalBusy(false);
    if (res.ok) {
      setForm((f) => ({ ...f, calendar_event_id: res.eventId }));
      if (existing) updateTask(existing.id, { calendar_event_id: res.eventId });
      track('calendar_added');
      hapticSuccess();
      toast.show('Added to your calendar 📅', 'success');
    } else {
      toast.show(res.message, 'error');
    }
  };

  const confirmDelete = () => {
    if (!existing) return;
    hapticWarning();
    Alert.alert('Delete this item?', `“${existing.title}” will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeTask(existing.id);
          toast.show('Deleted');
          navigation.goBack();
        },
      },
    ]);
  };

  const canCalendar = !!form.date || !!form.deadline;
  const inCalendar = !!form.calendar_event_id;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={existing ? 'Details' : 'New item'} onBack={() => navigation.goBack()} closeIcon />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 150 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TaskForm value={form} onChange={change} titleError={titleError} />

        <View style={styles.extra}>
          {canCalendar ? (
            <Button
              label={inCalendar ? 'Added to Calendar' : 'Add to Calendar'}
              icon={inCalendar ? 'checkmark-circle' : 'calendar'}
              variant="soft"
              loading={calBusy}
              disabled={inCalendar}
              onPress={calendar}
            />
          ) : null}
          {existing ? (
            <>
              <Button
                label={existing.status === 'open' ? 'Mark complete' : 'Reopen'}
                icon="checkmark-done"
                variant="secondary"
                onPress={() => {
                  toggleDone(existing.id);
                  toast.show(existing.status === 'open' ? 'Marked complete ✓' : 'Reopened', 'success');
                  navigation.goBack();
                }}
              />
              <Button label="Delete" icon="trash-outline" variant="danger" onPress={confirmDelete} />
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        <Button label={existing ? 'Save changes' : 'Add to Inbox'} icon="checkmark" onPress={save} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  extra: { gap: 12, marginTop: 24 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'rgba(243,244,251,0.96)', borderTopWidth: 1, borderTopColor: colors.line },
});
