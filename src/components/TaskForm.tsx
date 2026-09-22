import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { sourceMeta } from '../constants/sources';
import { colors, MIN_TOUCH, priorityMeta, radius } from '../constants/theme';
import type { DraftItem, ItemType } from '../types';
import { combineLocal, formatDateShort, formatTime, pad2, parseYMD, toYMD } from '../utils/date';
import { PRIORITY_ORDER } from '../utils/priority';
import { Button } from './Button';
import { Chip } from './Chip';
import { Icon, IconName } from './Icon';
import { Segmented } from './Segmented';
import { TextField } from './TextField';

interface Props {
  value: DraftItem;
  onChange: (patch: Partial<DraftItem>) => void;
  titleError?: string | null;
}

type Target = 'date' | 'time' | 'deadlineDate' | 'deadlineTime' | null;

function PickRow({ icon, label, value, onPress, onClear }: { icon: IconName; label: string; value: string | null; onPress: () => void; onClear: () => void }) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        style={styles.rowMain}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? 'not set'}. Change`}
      >
        <Icon name={icon} size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={[styles.rowValue, !value && { color: '#8E89AD', fontWeight: '500' }]}>{value ?? 'Not set'}</Text>
        </View>
      </Pressable>
      {value ? (
        <Pressable onPress={onClear} style={styles.clear} accessibilityRole="button" accessibilityLabel={`Clear ${label}`}>
          <Icon name="close-circle" size={22} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const hm = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

export function TaskForm({ value, onChange, titleError }: Props) {
  const [picker, setPicker] = useState<Target>(null);
  const [peopleText, setPeopleText] = useState(value.people.join(', '));
  const [linksText, setLinksText] = useState(value.links.join('\n'));

  const deadlineDate = value.deadline ? new Date(value.deadline) : null;
  const validDeadline = deadlineDate && !isNaN(deadlineDate.getTime()) ? deadlineDate : null;

  const pickerValue = (): Date => {
    switch (picker) {
      case 'date':
        return parseYMD(value.date) ?? new Date();
      case 'time':
        return combineLocal(toYMD(new Date()), value.time, '09:00') ?? new Date();
      default:
        return validDeadline ?? combineLocal(value.date, value.time, '17:00') ?? new Date();
    }
  };

  const onPick = (e: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS === 'android') setPicker(null);
    if (e.type === 'dismissed' || !d) return;
    if (picker === 'date') onChange({ date: toYMD(d) });
    else if (picker === 'time') onChange({ time: hm(d) });
    else if (picker === 'deadlineDate') {
      const [h, m] = validDeadline ? [validDeadline.getHours(), validDeadline.getMinutes()] : (value.time ?? '23:59').split(':').map(Number);
      onChange({ deadline: new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).toISOString() });
    } else if (picker === 'deadlineTime') {
      const base = validDeadline ?? parseYMD(value.date) ?? new Date();
      onChange({ deadline: new Date(base.getFullYear(), base.getMonth(), base.getDate(), d.getHours(), d.getMinutes()).toISOString() });
    }
  };

  const dateObj = parseYMD(value.date);
  return (
    <View style={{ gap: 16 }}>
      <TextField label="Title" value={value.title} onChangeText={(t) => onChange({ title: t })} placeholder="What needs to happen?" error={titleError} maxLength={120} />

      <View>
        <Text style={styles.label}>Type</Text>
        <Segmented<ItemType>
          value={value.type}
          onChange={(t) => onChange({ type: t })}
          options={[{ value: 'task', label: 'Task' }, { value: 'event', label: 'Event' }, { value: 'note', label: 'Note' }]}
        />
      </View>

      <View>
        <Text style={styles.label}>Priority</Text>
        <View style={styles.chips}>
          {[...PRIORITY_ORDER].reverse().map((p) => (
            <Chip key={p} label={priorityMeta[p].label} selected={value.priority === p} color={priorityMeta[p].color} soft={priorityMeta[p].soft} onPress={() => onChange({ priority: p })} />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <PickRow icon="calendar-outline" label="Date" value={dateObj ? formatDateShort(dateObj) : null} onPress={() => setPicker('date')} onClear={() => onChange({ date: null })} />
        <View style={styles.sep} />
        <PickRow icon="time-outline" label="Time" value={formatTime(value.time)} onPress={() => setPicker('time')} onClear={() => onChange({ time: null })} />
        <View style={styles.sep} />
        <PickRow icon="alarm-outline" label="Deadline date" value={validDeadline ? formatDateShort(validDeadline) : null} onPress={() => setPicker('deadlineDate')} onClear={() => onChange({ deadline: null })} />
        {validDeadline ? (
          <>
            <View style={styles.sep} />
            <PickRow icon="hourglass-outline" label="Deadline time" value={formatTime(hm(validDeadline))} onPress={() => setPicker('deadlineTime')} onClear={() => onChange({ deadline: null })} />
          </>
        ) : null}
      </View>

      {picker ? (
        <View style={styles.pickerBox}>
          <DateTimePicker
            value={pickerValue()}
            mode={picker === 'time' || picker === 'deadlineTime' ? 'time' : 'date'}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onPick}
          />
          {Platform.OS === 'ios' ? <Button label="Done" variant="soft" small onPress={() => setPicker(null)} /> : null}
        </View>
      ) : null}

      <TextField label="Venue" value={value.venue ?? ''} onChangeText={(t) => onChange({ venue: t.trim() ? t : null })} placeholder="e.g. Seminar Hall" />
      <TextField
        label="People (comma separated)"
        value={peopleText}
        onChangeText={(t) => {
          setPeopleText(t);
          onChange({ people: t.split(',').map((s) => s.trim()).filter(Boolean) });
        }}
        placeholder="Rohit, Ravi"
        autoCapitalize="words"
      />
      <TextField
        label="Links (one per line)"
        value={linksText}
        onChangeText={(t) => {
          setLinksText(t);
          onChange({ links: t.split(/[\n,\s]+/).map((s) => s.trim()).filter(Boolean) });
        }}
        placeholder="https://…"
        autoCapitalize="none"
        keyboardType="url"
        multiline
        style={{ minHeight: 70 }}
      />
      <TextField label="Details" value={value.description} onChangeText={(t) => onChange({ description: t })} placeholder="Anything else to remember" multiline />

      {value.original_text ? (
        <View style={styles.original}>
          <Text style={styles.label}>Original ({sourceMeta[value.source].label.toLowerCase()})</Text>
          <Text style={styles.originalText}>{value.original_text}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 6, marginLeft: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  group: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: MIN_TOUCH + 8, paddingHorizontal: 16 },
  rowLabel: { fontSize: 12, fontWeight: '700', color: colors.muted },
  rowValue: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 1 },
  clear: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  sep: { height: 1, backgroundColor: colors.line, marginLeft: 48 },
  pickerBox: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 8, borderWidth: 1.5, borderColor: colors.line },
  original: { backgroundColor: '#EFEEF9', borderRadius: radius.md, padding: 14 },
  originalText: { fontSize: 14, lineHeight: 20, color: colors.inkSoft },
});
