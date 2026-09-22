import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, priorityMeta, radius, shadow, type } from '../constants/theme';
import { useTasks } from '../context/TasksContext';
import { useAppNav } from '../hooks/useAppNav';
import { formatWhen } from '../utils/date';
import { digestStats, sectionOf } from '../utils/inbox';
import { rankPriority } from '../utils/priority';

const NOISE = [
  { app: 'WhatsApp', text: 'CSE-2027 Group: 47 new messages' },
  { app: 'Gmail', text: 'Placement cell: 12 new mails' },
  { app: 'Instagram', text: 'college.memes and 8 others liked your post' },
  { app: 'Classroom', text: 'New material posted in DS' },
  { app: 'Swiggy', text: '50% off tonight only!' },
];

export function DigestScreen() {
  const nav = useAppNav();
  const insets = useSafeAreaInsets();
  const { tasks } = useTasks();
  const now = new Date();
  const stats = useMemo(() => digestStats(tasks, now), [tasks]); // eslint-disable-line react-hooks/exhaustive-deps
  const top = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'open' && ['urgent', 'today'].includes(sectionOf(t, now)))
        .sort((a, b) => rankPriority(b.priority) - rankPriority(a.priority))
        .slice(0, 4),
    [tasks], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <View style={styles.root}>
      <ScreenHeader title="Your Sift Digest" onBack={() => nav.goBack()} closeIcon />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 30, gap: 18 }} showsVerticalScrollIndicator={false}>
        <View style={styles.noiseCard}>
          <Text style={styles.noiseTitle}>Before: {stats.noisy} notifications</Text>
          {NOISE.map((n) => (
            <View key={n.app} style={styles.noiseRow}>
              <Text style={styles.noiseApp}>{n.app}</Text>
              <Text style={styles.noiseText} numberOfLines={1}>{n.text}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.digest, { backgroundColor: colors.primaryDeep }, shadow.card]}>
          <Text style={styles.dKicker}>✨ After: what actually matters</Text>
          <Text style={styles.dHeadline}>
            Instead of {stats.noisy} notifications, Sift found {stats.meaningful} {stats.meaningful === 1 ? 'thing' : 'things'} that actually matter.
          </Text>

          <View style={styles.stats}>
            <View style={styles.stat}><Text style={styles.statNum}>🔴 {stats.urgent}</Text><Text style={styles.statLabel}>urgent {stats.urgent === 1 ? 'action' : 'actions'}</Text></View>
            <View style={styles.stat}><Text style={styles.statNum}>🟠 {stats.dueToday}</Text><Text style={styles.statLabel}>{stats.dueToday === 1 ? 'task' : 'tasks'} due today</Text></View>
            <View style={styles.stat}><Text style={styles.statNum}>🔵 {stats.upcomingEvents}</Text><Text style={styles.statLabel}>upcoming {stats.upcomingEvents === 1 ? 'event' : 'events'}</Text></View>
          </View>
        </View>

        {top.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Text style={type.h2}>Start here</Text>
            {top.map((t) => (
              <View key={t.id} style={[styles.item, shadow.card]}>
                <View style={[styles.itemBar, { backgroundColor: priorityMeta[t.priority].color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{t.title}</Text>
                  <Text style={styles.itemMeta}>{formatWhen(t, now) ?? 'No date'}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.foot}>This is a simulated digest built from your Sift items. Sift does not read your other notifications.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  noiseCard: { backgroundColor: '#ECEBF5', borderRadius: radius.lg, padding: 16, gap: 8, opacity: 0.85 },
  noiseTitle: { fontSize: 15, fontWeight: '800', color: colors.muted, marginBottom: 2 },
  noiseRow: { flexDirection: 'row', gap: 10 },
  noiseApp: { width: 78, fontSize: 13, fontWeight: '800', color: '#8A85AA' },
  noiseText: { flex: 1, fontSize: 13, color: '#8A85AA', textDecorationLine: 'line-through' },
  digest: { borderRadius: radius.xl, padding: 22 },
  dKicker: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '800' },
  dHeadline: { color: colors.white, fontSize: 22, lineHeight: 29, fontWeight: '800', marginTop: 8, letterSpacing: -0.3 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 20 },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.md, padding: 12 },
  statNum: { color: colors.white, fontSize: 24, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: '700', marginTop: 2 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 12, paddingRight: 14, overflow: 'hidden' },
  itemBar: { width: 5, alignSelf: 'stretch', marginRight: 14 },
  itemTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  itemMeta: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 2 },
  foot: { ...type.small, textAlign: 'center' },
});
