import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

export function SectionHeader({ title, color, count }: { title: string; color: string; count: number }) {
  return (
    <View style={styles.row} accessibilityRole="header">
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.title, { color }]}>{title}</Text>
      <View style={styles.count}>
        <Text style={styles.countText}>{count}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 22, paddingBottom: 10, paddingHorizontal: 4 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  title: { fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  count: { minWidth: 24, paddingHorizontal: 7, height: 22, borderRadius: 11, backgroundColor: '#E6E4F5', alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 12, fontWeight: '800', color: colors.muted },
});
