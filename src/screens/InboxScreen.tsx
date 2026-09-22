import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, LayoutAnimation, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { DigestCard } from '../components/DigestCard';
import { EmptyState } from '../components/EmptyState';
import { SectionHeader } from '../components/SectionHeader';
import { TaskCard } from '../components/TaskCard';
import { colors, priorityMeta, radius, type } from '../constants/theme';
import { useSettings } from '../context/SettingsContext';
import { useTasks } from '../context/TasksContext';
import { useToast } from '../context/ToastContext';
import { useAppNav } from '../hooks/useAppNav';
import { useNow } from '../hooks/useNow';
import type { Task } from '../types';
import { greeting } from '../utils/date';
import { hapticWarning } from '../utils/haptics';
import { buildSections, digestStats } from '../utils/inbox';
import { PRIORITY_ORDER } from '../utils/priority';

export function InboxScreen() {
  const nav = useAppNav();
  const insets = useSafeAreaInsets();
  const { tasks, loading, refreshing, refresh, toggleDone, removeTask, setPriority } = useTasks();
  const { settings } = useSettings();
  const toast = useToast();
  const now = useNow();
  const [showDone, setShowDone] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);

  const sections = useMemo(() => buildSections(tasks, now), [tasks, now]);
  const stats = useMemo(() => digestStats(tasks, now), [tasks, now]);
  const done = useMemo(
    () => tasks.filter((t) => t.status === 'done').sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [tasks],
  );
  const menuTask = menuId ? tasks.find((t) => t.id === menuId) ?? null : null;

  const onComplete = useCallback(
    (t: Task) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      toggleDone(t.id);
      toast.show(t.status === 'open' ? 'Marked complete ✓' : 'Moved back to your inbox', 'success');
    },
    [toggleDone, toast],
  );
  const onOpen = useCallback((t: Task) => nav.navigate('TaskDetail', { id: t.id }), [nav]);
  const onMore = useCallback((t: Task) => setMenuId(t.id), []);

  const confirmDelete = (t: Task) => {
    hapticWarning();
    Alert.alert('Delete this item?', `“${t.title}” will be removed from your inbox.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          removeTask(t.id);
          setMenuId(null);
          toast.show('Deleted');
        },
      },
    ]);
  };

  const header = (
    <View style={{ paddingTop: insets.top + 14 }}>
      <Text style={styles.greeting} accessibilityRole="header">{greeting(now)}</Text>
      <Text style={styles.sub}>Here’s what needs your attention.</Text>
      {settings.demoMode ? (
        <View style={styles.demoPill}>
          <Text style={styles.demoPillText}>Demo Mode · sample data & offline AI</Text>
        </View>
      ) : null}
      <DigestCard stats={stats} onPress={() => nav.navigate('Digest')} />
    </View>
  );

  const footer = (
    <View style={{ marginTop: 10 }}>
      {done.length > 0 ? (
        <>
          <Button
            variant="ghost"
            small
            icon={showDone ? 'chevron-up' : 'chevron-down'}
            label={`${showDone ? 'Hide' : 'Show'} completed (${done.length})`}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setShowDone((v) => !v);
            }}
          />
          {showDone ? done.map((t) => (
            <TaskCard key={t.id} task={t} now={now} onComplete={onComplete} onOpen={onOpen} onMore={onMore} />
          )) : null}
        </>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          <EmptyState
            emoji="📥"
            title="Your inbox is clear"
            message="Snap a task, say what’s on your mind, or paste a message. Sift turns it into actions."
            actionLabel="Capture something"
            onAction={() => nav.navigate('Capture')}
          />
        }
        renderSectionHeader={({ section }) => <SectionHeader title={section.title} color={section.color} count={section.data.length} />}
        renderItem={({ item, index }) => <TaskCard task={item} index={index} now={now} onComplete={onComplete} onOpen={onOpen} onMore={onMore} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
      />

      <BottomSheet visible={!!menuTask} onClose={() => setMenuId(null)} title={menuTask?.title}>
        {menuTask ? (
          <View style={{ gap: 14 }}>
            <Text style={styles.sheetLabel}>Change priority</Text>
            <View style={styles.chips}>
              {[...PRIORITY_ORDER].reverse().map((p) => (
                <Chip
                  key={p}
                  label={priorityMeta[p].label}
                  selected={menuTask.priority === p}
                  color={priorityMeta[p].color}
                  soft={priorityMeta[p].soft}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setPriority(menuTask.id, p);
                    setMenuId(null);
                    toast.show(`Priority set to ${priorityMeta[p].label.toLowerCase()}`);
                  }}
                />
              ))}
            </View>
            <Button label="Edit" icon="create-outline" variant="secondary" onPress={() => { setMenuId(null); nav.navigate('TaskDetail', { id: menuTask.id }); }} />
            <Button label={menuTask.status === 'open' ? 'Mark complete' : 'Reopen'} icon="checkmark-circle-outline" variant="soft" onPress={() => { onComplete(menuTask); setMenuId(null); }} />
            <Button label="Delete" icon="trash-outline" variant="danger" onPress={() => confirmDelete(menuTask)} />
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  greeting: { ...type.display },
  sub: { ...type.body, fontSize: 17, color: colors.muted, marginTop: 4 },
  demoPill: { alignSelf: 'flex-start', backgroundColor: colors.aquaSoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, marginTop: 12 },
  demoPillText: { color: '#0B6B62', fontSize: 12, fontWeight: '800' },
  sheetLabel: { fontSize: 13, fontWeight: '700', color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
