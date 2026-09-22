import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors, gradients, type } from '../constants/theme';

const STEPS = ['Reading your input...', 'Finding dates...', 'Understanding intent...', 'Creating actions...'];

/** The visible "AI at work" moment: pulsing orb, cycling steps, then "3 actions found ✨". */
export function ProcessingView({ foundCount, steps = STEPS }: { foundCount: number | null; steps?: string[] }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (foundCount !== null) return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 900);
    return () => clearInterval(id);
  }, [foundCount, steps.length]);

  useEffect(() => {
    if (foundCount !== null) {
      Animated.spring(pop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
    }
  }, [foundCount, pop]);

  const ring = (delay: number) => {
    const shifted = Animated.modulo(Animated.add(pulse, delay), 1);
    return {
      opacity: shifted.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
      transform: [{ scale: shifted.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
    };
  };

  const done = foundCount !== null;
  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={styles.orbWrap}>
        <Animated.View style={[styles.ring, ring(0)]} />
        <Animated.View style={[styles.ring, ring(0.5)]} />
        <LinearGradient colors={gradients.ai} style={styles.orb} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.orbEmoji}>{done ? '✨' : '🧠'}</Text>
        </LinearGradient>
      </View>

      {done ? (
        <Animated.Text style={[styles.found, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }], opacity: pop }]}>
          {foundCount} {foundCount === 1 ? 'action' : 'actions'} found ✨
        </Animated.Text>
      ) : (
        <View style={styles.steps}>
          {steps.map((s, i) => (
            <Text key={s} style={[styles.step, i === step && styles.stepActive, i < step && styles.stepDone]}>
              {i < step ? '✓  ' : i === step ? '●  ' : '○  '}
              {s}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  orbWrap: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center', marginBottom: 36 },
  ring: { position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: colors.primary },
  orb: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center' },
  orbEmoji: { fontSize: 46 },
  steps: { alignSelf: 'stretch', paddingLeft: 40, gap: 10 },
  step: { ...type.body, color: '#A7A3C4', fontWeight: '600' },
  stepActive: { color: colors.ink, fontWeight: '800' },
  stepDone: { color: colors.aqua },
  found: { ...type.title, color: colors.primary },
});
