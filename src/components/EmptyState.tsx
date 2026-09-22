import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, type } from '../constants/theme';
import { Button } from './Button';

interface Props {
  emoji: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ emoji, title, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.msg}>{message}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} icon="sparkles" style={{ marginTop: 18 }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  badge: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 38 },
  title: { ...type.h2, marginTop: 18, textAlign: 'center' },
  msg: { ...type.body, marginTop: 8, textAlign: 'center', color: colors.muted },
});
