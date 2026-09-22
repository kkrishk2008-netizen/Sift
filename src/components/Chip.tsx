import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, MIN_TOUCH } from '../constants/theme';
import { hapticSelect } from '../utils/haptics';

interface Props {
  label: string;
  selected?: boolean;
  onPress: () => void;
  color?: string;
  soft?: string;
  emoji?: string;
}

export function Chip({ label, selected, onPress, color = colors.primary, soft = colors.primarySoft, emoji }: Props) {
  return (
    <Pressable
      onPress={() => {
        hapticSelect();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? color : soft, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[styles.text, { color: selected ? colors.white : color }]}>
        {emoji ? `${emoji} ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: MIN_TOUCH - 8, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 14, fontWeight: '700' },
});
