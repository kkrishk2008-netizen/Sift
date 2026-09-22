import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { priorityMeta } from '../constants/theme';
import type { Priority } from '../types';

export function PriorityBadge({ priority, compact }: { priority: Priority; compact?: boolean }) {
  const m = priorityMeta[priority];
  return (
    <View
      accessible
      accessibilityLabel={`Priority ${m.label.toLowerCase()}`}
      style={[styles.badge, { backgroundColor: m.soft }, compact && styles.compact]}
    >
      <Text style={styles.emoji}>{m.emoji}</Text>
      <Text style={[styles.label, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  compact: { paddingHorizontal: 8, paddingVertical: 3 },
  emoji: { fontSize: 11 },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
});
