import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { sourceMeta, typeMeta } from '../constants/sources';
import { colors, priorityMeta, radius, shadow, type } from '../constants/theme';
import type { Task } from '../types';
import { formatDeadline, formatWhen } from '../utils/date';
import { hapticSuccess, hapticTap } from '../utils/haptics';
import { Button } from './Button';
import { Icon, IconName } from './Icon';
import { PriorityBadge } from './PriorityBadge';

interface Props {
  task: Task;
  index?: number;
  now: Date;
  onComplete: (t: Task) => void;
  onOpen: (t: Task) => void;
  onMore: (t: Task) => void;
}

function Meta({ icon, text, color = colors.muted }: { icon: IconName; text: string; color?: string }) {
  return (
    <View style={styles.metaRow}>
      <Icon name={icon} size={16} color={color} />
      <Text style={[styles.metaText, { color }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function TaskCardBase({ task, index = 0, now, onComplete, onOpen, onMore }: Props) {
  const enter = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const meta = priorityMeta[task.priority];
  const done = task.status === 'done';

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index, 6) * 55,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  const when = formatWhen(task, now);
  const deadline = formatDeadline(task, now);
  const showDeadline = !!deadline && task.type === 'event';
  const link = task.links[0];

  const complete = () => {
    if (done) {
      onComplete(task);
      return;
    }
    hapticSuccess();
    Animated.timing(exit, { toValue: 1, duration: 240, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() =>
      onComplete(task),
    );
  };

  const openLink = () => {
    const url = /^https?:\/\//i.test(link) ? link : `https://${link}`;
    Linking.openURL(url).catch(() => undefined);
  };

  return (
    <Animated.View
      style={[
        styles.card,
        shadow.card,
        {
          opacity: Animated.multiply(enter, exit.interpolate({ inputRange: [0, 1], outputRange: [done ? 0.6 : 1, 0] })),
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
            { translateX: exit.interpolate({ inputRange: [0, 1], outputRange: [0, 60] }) },
          ],
        },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: meta.color }]} />
      <Pressable
        onPress={() => {
          hapticTap();
          onOpen(task);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${task.title}. ${meta.label.toLowerCase()} priority. ${when ?? 'No date'}. Open details`}
      >
        <View style={styles.head}>
          <PriorityBadge priority={task.priority} />
          <View style={styles.typeChip}>
            <Icon name={typeMeta[task.type].icon as IconName} size={13} color={colors.primary} />
            <Text style={styles.typeText}>{typeMeta[task.type].label}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => {
              hapticTap();
              onMore(task);
            }}
            hitSlop={8}
            style={styles.more}
            accessibilityRole="button"
            accessibilityLabel="More actions"
          >
            <Icon name="ellipsis-horizontal" size={22} color={colors.muted} />
          </Pressable>
        </View>

        <Text style={[styles.title, done && styles.titleDone]}>{task.title}</Text>

        <View style={styles.metaBlock}>
          <Meta icon="time-outline" text={`${task.type === 'task' ? 'Due' : 'When'}: ${when ?? 'No date set'}`} color={when ? colors.inkSoft : colors.muted} />
          {showDeadline ? <Meta icon="alarm-outline" text={`Register by: ${deadline}`} color={priorityMeta.high.color} /> : null}
          {task.venue ? <Meta icon="location-outline" text={task.venue} /> : null}
          <Meta icon={sourceMeta[task.source].icon as IconName} text={`Source: ${sourceMeta[task.source].label}`} />
        </View>

        {task.description ? (
          <Text style={styles.desc} numberOfLines={2}>
            “{task.description}”
          </Text>
        ) : null}

        {task.people.length > 0 ? (
          <View style={styles.people}>
            {task.people.slice(0, 3).map((p) => (
              <View key={p} style={styles.person}>
                <Text style={styles.personText}>👤 {p}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Pressable>

      {link ? (
        <Pressable onPress={openLink} style={styles.link} accessibilityRole="link" accessibilityLabel={`Open link ${link}`}>
          <Icon name="link-outline" size={16} color={colors.primary} />
          <Text style={styles.linkText} numberOfLines={1}>
            {link.replace(/^https?:\/\//i, '')}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={done ? 'Undo' : 'Complete'}
          icon={done ? 'arrow-undo' : 'checkmark-circle'}
          variant={done ? 'secondary' : 'primary'}
          small
          onPress={complete}
          style={{ flex: 1 }}
        />
        <Button label="View" icon="open-outline" variant="soft" small onPress={() => onOpen(task)} style={{ flex: 1 }} />
      </View>
    </Animated.View>
  );
}

export const TaskCard = React.memo(TaskCardBase);

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, paddingLeft: 20, marginBottom: 14, overflow: 'hidden' },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  typeText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  more: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: -8, marginTop: -6 },
  title: { ...type.h2, marginTop: 8 },
  titleDone: { textDecorationLine: 'line-through', color: colors.muted },
  metaBlock: { marginTop: 10, gap: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  desc: { ...type.body, marginTop: 10, fontStyle: 'italic', color: colors.inkSoft },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  person: { backgroundColor: '#F0EFF9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  personText: { fontSize: 13, fontWeight: '700', color: colors.inkSoft },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, minHeight: 32 },
  linkText: { color: colors.primary, fontSize: 14, fontWeight: '700', flexShrink: 1, textDecorationLine: 'underline' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
