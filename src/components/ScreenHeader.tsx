import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, type } from '../constants/theme';
import { hapticTap } from '../utils/haptics';
import { Icon } from './Icon';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  closeIcon?: boolean;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, onBack, closeIcon, right }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        {onBack ? (
          <Pressable
            onPress={() => {
              hapticTap();
              onBack();
            }}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel={closeIcon ? 'Close' : 'Go back'}
          >
            <Icon name={closeIcon ? 'close' : 'chevron-back'} size={24} color={colors.ink} />
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        <View style={{ flex: 1 }} />
        {right}
      </View>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingBottom: 8 },
  top: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  back: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginLeft: -12 },
  title: { ...type.title, marginTop: 4 },
  subtitle: { ...type.body, marginTop: 6, color: colors.muted },
});
