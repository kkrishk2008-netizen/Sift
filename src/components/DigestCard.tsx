import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow } from '../constants/theme';
import type { DigestStats } from '../utils/inbox';
import { Icon } from './Icon';

export function DigestCard({ stats, onPress }: { stats: DigestStats; onPress: () => void }) {
  if (stats.meaningful === 0) return null;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Open your Sift digest" style={{ marginTop: 18 }}>
      <View style={[styles.card, { backgroundColor: colors.primaryDeep }, shadow.card]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>✨ Your Sift Digest</Text>
          <Text style={styles.text}>
            Instead of {stats.noisy} notifications, Sift found {stats.meaningful} {stats.meaningful === 1 ? 'thing' : 'things'} that actually matter.
          </Text>
        </View>
        <Icon name="chevron-forward" size={22} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  kicker: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: '800' },
  text: { color: '#FFFFFF', fontSize: 16, lineHeight: 22, fontWeight: '700', marginTop: 4 },
});
