import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, gradients, MIN_TOUCH, priorityMeta, radius, shadow } from '../constants/theme';
import { hapticTap } from '../utils/haptics';
import { Icon, IconName } from './Icon';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({
  label, onPress, variant = 'primary', icon, loading, disabled, small, style, accessibilityHint,
}: Props) {
  const isPrimary = variant === 'primary';
  const fg =
    isPrimary ? colors.white
    : variant === 'danger' ? priorityMeta.urgent.color
    : variant === 'ghost' ? colors.muted
    : colors.primary;
  const bg =
    variant === 'secondary' ? colors.surface
    : variant === 'soft' ? colors.primarySoft
    : variant === 'danger' ? priorityMeta.urgent.soft
    : 'transparent';
  const off = disabled || loading;

  const content = (
    <View style={[styles.row, small && styles.rowSmall]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={small ? 18 : 20} color={fg} /> : null}
          <Text style={[styles.label, small && styles.labelSmall, { color: fg }]}>{label}</Text>
        </>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={() => {
        hapticTap();
        onPress();
      }}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        { minHeight: small ? 40 : MIN_TOUCH + 4, opacity: off ? 0.5 : pressed ? 0.85 : 1 },
        isPrimary ? shadow.card : null,
        variant === 'secondary' && styles.bordered,
        !isPrimary && { backgroundColor: bg },
        style,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]}
        />
      ) : null}
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bordered: { borderWidth: 1.5, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowSmall: { gap: 6 },
  label: { fontSize: 16, fontWeight: '700' },
  labelSmall: { fontSize: 14 },
});
