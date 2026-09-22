import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { gradients, radius, shadow } from '../constants/theme';

/** A drawn hackathon poster used by the "Use sample poster" demo path (no image asset needed). */
export function DemoPoster({ dayLabel, time }: { dayLabel: string; time: string }) {
  return (
    <LinearGradient colors={gradients.poster} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.poster, shadow.card]}>
      <View style={styles.blobA} />
      <View style={styles.blobB} />
      <Text style={styles.kicker}>INNOVATION CELL PRESENTS</Text>
      <Text style={styles.title}>HACKATHON{'\n'}2026</Text>
      <Text style={styles.line}>Registration closes {dayLabel}</Text>
      <View style={styles.pills}>
        <View style={styles.pill}><Text style={styles.pillText}>📍 Venue: Innovation Lab</Text></View>
        <View style={styles.pill}><Text style={styles.pillText}>⏰ {time}</Text></View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  poster: { borderRadius: radius.xl, padding: 24, overflow: 'hidden', minHeight: 300, justifyContent: 'flex-end' },
  blobA: { position: 'absolute', top: -50, right: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.14)' },
  blobB: { position: 'absolute', top: 70, left: -60, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(18,181,166,0.35)' },
  kicker: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#FFFFFF', fontSize: 44, lineHeight: 46, fontWeight: '900', letterSpacing: -1, marginTop: 8 },
  line: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 14 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  pill: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  pillText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
