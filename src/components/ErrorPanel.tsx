import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, priorityMeta, radius, type } from '../constants/theme';
import { Button } from './Button';

interface Props {
  title: string;
  hint: string;
  onRetry: () => void;
  onManual: () => void;
}

/** "Couldn't analyze this automatically." with the two recovery paths the brief asks for. */
export function ErrorPanel({ title, hint, onRetry, onManual }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Text style={styles.emoji}>🫥</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
      <Button label="Try Again" icon="refresh" onPress={onRetry} style={styles.btn} />
      <Button label="Create Manually" icon="create-outline" variant="secondary" onPress={onManual} style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: 24, alignItems: 'center',
    borderWidth: 1.5, borderColor: priorityMeta.urgent.soft,
  },
  emoji: { fontSize: 40 },
  title: { ...type.h2, textAlign: 'center', marginTop: 10 },
  hint: { ...type.body, textAlign: 'center', color: colors.muted, marginTop: 8, marginBottom: 18 },
  btn: { alignSelf: 'stretch', marginTop: 10 },
});
