import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { colors, priorityMeta, radius, shadow, type } from '../constants/theme';
import { useTasks } from '../context/TasksContext';
import { useToast } from '../context/ToastContext';
import { useAppNav } from '../hooks/useAppNav';
import { useNow } from '../hooks/useNow';
import { track } from '../services/analytics';
import { addToDeviceCalendar } from '../services/calendar/calendarService';
import type { Task } from '../types';
import { formatDateShort, formatDeadline, formatTime, isSameDay, MONTH_LONG, monthGrid, startOfDay, toYMD, WEEKDAY_SHORT } from '../utils/date';
import { hapticSelect, hapticSuccess } from '../utils/haptics';
import { taskDayKeys } from '../utils/inbox';
import { rankPriority } from '../utils/priority';

export function CalendarScreen() {
  const nav = useAppNav();
  const insets = useSafeAreaInsets();
  const { tasks, updateTask } = useTasks();
  const toast = useToast();
  const now = useNow();
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState(() => startOfDay(now));

  const byDay = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      if (t.status !== 'open') continue;
      for (const k of taskDayKeys(t)) m.set(k, [...(m.get(k) ?? []), t]);
    }
    return m;
  }, [tasks]);

  const grid = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const dayItems = useMemo(
    () =>
      [...(byDay.get(toYMD(selected)) ?? [])].sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99') || rankPriority(b.priority) - rankPriority(a.priority)),
    [byDay, selected],
  );

  const shiftMonth = (n: number) => {
    hapticSelect();
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  };
  const goToday = () => {
    hapticSelect();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(startOfDay(now));
  };

  const addCal = async (t: Task) => {
    const res = await addToDeviceCalendar(t);
    if (res.ok) {
      updateTask(t.id, { calendar_event_id: res.eventId });
      hapticSuccess();
      track('calendar_added');
      toast.show('Added to your calendar 📅', 'success');
    } else {
      toast.show(res.message, 'error');
    }
  };

  const cellW = `${100 / 7}%` as const;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.title} accessibilityRole="header">Calendar</Text>

      <View style={[styles.monthCard, shadow.card]}>
        <View style={styles.monthHead}>
          <Pressable onPress={() => shiftMonth(-1)} style={styles.nav} accessibilityRole="button" accessibilityLabel="Previous month">
            <Icon name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
          <Text style={styles.monthLabel}>{MONTH_LONG[cursor.getMonth()]} {cursor.getFullYear()}</Text>
          <Pressable onPress={() => shiftMonth(1)} style={styles.nav} accessibilityRole="button" accessibilityLabel="Next month">
            <Icon name="chevron-forward" size={22} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAY_SHORT.map((d) => (
            <Text key={d} style={[styles.weekday, { width: cellW }]}>{d.slice(0, 2)}</Text>
          ))}
        </View>

        <View style={styles.grid}>
          {grid.map((d) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const isSel = isSameDay(d, selected);
            const isNow = isSameDay(d, now);
            const items = byDay.get(toYMD(d)) ?? [];
            const dots = [...items].sort((a, b) => rankPriority(b.priority) - rankPriority(a.priority)).slice(0, 3);
            return (
              <Pressable
                key={d.toISOString()}
                onPress={() => {
                  hapticSelect();
                  setSelected(startOfDay(d));
                  if (!inMonth) setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                }}
                style={[styles.cell, { width: cellW }]}
                accessibilityRole="button"
                accessibilityLabel={`${formatDateShort(d, now)}, ${items.length} ${items.length === 1 ? 'item' : 'items'}`}
                accessibilityState={{ selected: isSel }}
              >
                <View style={[styles.dayBubble, isSel && styles.daySel, isNow && !isSel && styles.dayNow]}>
                  <Text style={[styles.dayText, !inMonth && { color: '#B5B1CE' }, isSel && { color: colors.white }]}>{d.getDate()}</Text>
                </View>
                <View style={styles.dots}>
                  {dots.map((t) => (
                    <View key={t.id} style={[styles.dot, { backgroundColor: priorityMeta[t.priority].color }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.dayHead}>
        <Text style={styles.dayTitle}>{isSameDay(selected, now) ? 'Today' : formatDateShort(selected, now)}</Text>
        {!isSameDay(selected, now) ? (
          <Pressable onPress={goToday} style={styles.todayBtn} accessibilityRole="button" accessibilityLabel="Jump to today">
            <Text style={styles.todayText}>Today</Text>
          </Pressable>
        ) : null}
      </View>

      {dayItems.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 30 }}>🌤</Text>
          <Text style={styles.emptyTitle}>Nothing scheduled</Text>
          <Text style={styles.emptyText}>Actions with a date will show up here.</Text>
        </View>
      ) : (
        dayItems.map((t) => {
          const m = priorityMeta[t.priority];
          const timeLabel = formatTime(t.time);
          const isDeadlineDay = !!t.date && t.deadline && toYMD(new Date(t.deadline)) === toYMD(selected) && t.date !== toYMD(selected);
          return (
            <Pressable key={t.id} onPress={() => nav.navigate('TaskDetail', { id: t.id })} style={[styles.row, shadow.card]} accessibilityRole="button" accessibilityLabel={`${t.title}. Open details`}>
              <View style={[styles.rowBar, { backgroundColor: m.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={2}>{t.title}</Text>
                <Text style={styles.rowMeta}>
                  {isDeadlineDay ? `Deadline ${formatDeadline(t, now)?.replace(/^.*?, /, '') ?? ''}` : timeLabel ?? 'All day'}
                  {t.venue ? ` · ${t.venue}` : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => (t.calendar_event_id ? toast.show('Already in your calendar') : addCal(t))}
                style={styles.calBtn}
                accessibilityRole="button"
                accessibilityLabel={t.calendar_event_id ? 'Already added to phone calendar' : 'Add to phone calendar'}
              >
                <Icon name={t.calendar_event_id ? 'checkmark-circle' : 'calendar-outline'} size={24} color={t.calendar_event_id ? colors.success : colors.primary} />
              </Pressable>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { ...type.display },
  monthCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 12, marginTop: 16 },
  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  nav: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { ...type.h2 },
  weekRow: { flexDirection: 'row', marginTop: 4 },
  weekday: { textAlign: 'center', fontSize: 12, fontWeight: '800', color: colors.muted, paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center', height: 52, paddingTop: 2 },
  dayBubble: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  daySel: { backgroundColor: colors.primary },
  dayNow: { borderWidth: 2, borderColor: colors.primary },
  dayText: { fontSize: 15, fontWeight: '700', color: colors.ink },
  dots: { flexDirection: 'row', gap: 3, height: 7, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  dayTitle: { ...type.h2 },
  todayBtn: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.primarySoft, justifyContent: 'center' },
  todayText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  empty: { alignItems: 'center', padding: 30, gap: 4 },
  emptyTitle: { ...type.h3 },
  emptyText: { ...type.small },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 12, paddingRight: 6, marginBottom: 10, overflow: 'hidden' },
  rowBar: { width: 5, alignSelf: 'stretch', marginRight: 14 },
  rowTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  rowMeta: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 3 },
  calBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
