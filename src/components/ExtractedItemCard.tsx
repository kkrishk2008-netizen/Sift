import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { typeMeta } from '../constants/sources';
import { colors, priorityMeta, radius, shadow, type } from '../constants/theme';
import type { DraftItem, Priority } from '../types';
import { formatDeadline, formatTime, parseYMD, formatDateShort } from '../utils/date';
import { PRIORITY_ORDER } from '../utils/priority';
import { Button } from './Button';
import { Chip } from './Chip';
import { Icon, IconName } from './Icon';

interface Props {
  item: DraftItem;
  onPriority: (p: Priority) => void;
  onEdit: () => void;
  onRemove?: () => void;
  onCalendar: () => void;
  calendarBusy?: boolean;
}

function Line({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.line}>
      <Icon name={icon} size={20} color={colors.primary} />
      <Text style={styles.lineText}>{text}</Text>
    </View>
  );
}

export function ExtractedItemCard({ item, onPriority, onEdit, onRemove, onCalendar, calendarBusy }: Props) {
  const d = parseYMD(item.date);
  const time = formatTime(item.time);
  const deadline = formatDeadline(item);
  const hasDate = !!d || !!item.deadline;
  const added = !!item.calendar_event_id;

  return (
    <View style={[styles.card, shadow.card]}>
      <View style={styles.top}>
        <View style={styles.typePill}>
          <Icon name={typeMeta[item.type].icon as IconName} size={14} color={colors.primary} />
          <Text style={styles.typeText}>{typeMeta[item.type].label}</Text>
        </View>
        <Text style={styles.conf}>{Math.round(item.confidence * 100)}% sure</Text>
        <View style={{ flex: 1 }} />
        {onRemove ? (
          <Button label="Remove" small variant="ghost" icon="close" onPress={onRemove} accessibilityHint="Removes this item from the results" />
        ) : null}
      </View>

      <Text style={styles.title}>{item.title}</Text>

      <View style={styles.lines}>
        {d ? <Line icon="calendar-outline" text={formatDateShort(d)} /> : null}
        {time ? <Line icon="time-outline" text={time} /> : null}
        {item.venue ? <Line icon="location-outline" text={item.venue} /> : null}
        {deadline && item.type === 'event' ? <Line icon="alarm-outline" text={`Register by ${deadline}`} /> : null}
        {item.type === 'task' && !d && deadline ? <Line icon="alarm-outline" text={`Due ${deadline}`} /> : null}
        {item.people.length ? <Line icon="people-outline" text={item.people.join(', ')} /> : null}
        {!hasDate && !item.venue && !item.people.length ? <Line icon="remove-circle-outline" text="No date found. Nothing was guessed." /> : null}
      </View>

      {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}

      <Text style={styles.label}>Priority</Text>
      <View style={styles.chips}>
        {[...PRIORITY_ORDER].reverse().map((p) => (
          <Chip
            key={p}
            label={priorityMeta[p].label}
            selected={item.priority === p}
            color={priorityMeta[p].color}
            soft={priorityMeta[p].soft}
            onPress={() => onPriority(p)}
          />
        ))}
      </View>

      <View style={styles.actions}>
        {hasDate ? (
          <Button
            label={added ? 'Added to Calendar' : 'Add to Calendar'}
            icon={added ? 'checkmark-circle' : 'calendar'}
            variant={added ? 'secondary' : 'soft'}
            small
            loading={calendarBusy}
            disabled={added}
            onPress={onCalendar}
            style={{ flex: 1 }}
          />
        ) : null}
        <Button label="Edit" icon="create-outline" variant="secondary" small onPress={onEdit} style={{ flex: hasDate ? 0.6 : 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 20, marginBottom: 16 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  typeText: { fontSize: 13, fontWeight: '800', color: colors.primary },
  conf: { fontSize: 12, fontWeight: '700', color: colors.muted },
  title: { ...type.title, marginTop: 14 },
  lines: { marginTop: 14, gap: 10 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineText: { fontSize: 17, fontWeight: '600', color: colors.ink, flexShrink: 1 },
  desc: { ...type.body, marginTop: 14, color: colors.inkSoft },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 18, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
});
