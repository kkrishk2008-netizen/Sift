import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, NativeScrollEvent, NativeSyntheticEvent, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { colors, priorityMeta, radius, shadow, type } from '../constants/theme';
import { useSettings } from '../context/SettingsContext';

const SCATTER = [
  { label: '📸 Task photo', top: 10, left: 6, rot: '-8deg', amp: 8, bg: '#FFE9D6' },
  { label: '💬 WhatsApp', top: 62, left: 150, rot: '6deg', amp: -10, bg: '#DDF5EA' },
  { label: '🎙 Voice note', top: 138, left: 20, rot: '4deg', amp: 12, bg: '#E8EDFF' },
  { label: '🔔 47 notifications', top: 196, left: 120, rot: '-5deg', amp: -8, bg: '#FDECEC' },
];

function ScatterVisual() {
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float]);
  return (
    <View style={{ width: 300, height: 260 }}>
      {SCATTER.map((c) => (
        <Animated.View
          key={c.label}
          style={[
            styles.scatter,
            shadow.card,
            {
              top: c.top, left: c.left, backgroundColor: c.bg,
              transform: [{ rotate: c.rot }, { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, c.amp] }) }],
            },
          ]}
        >
          <Text style={styles.scatterText}>{c.label}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

function MiniCard({ title, meta, p }: { title: string; meta: string; p: keyof typeof priorityMeta }) {
  const m = priorityMeta[p];
  return (
    <View style={[styles.mini, shadow.card]}>
      <View style={[styles.miniBar, { backgroundColor: m.color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.miniTitle}>{title}</Text>
        <Text style={styles.miniMeta}>{meta}</Text>
      </View>
      <Text style={[styles.miniBadge, { color: m.color, backgroundColor: m.soft }]}>{m.label}</Text>
    </View>
  );
}

function UnderstandVisual() {
  return (
    <View style={{ width: 320, gap: 10 }}>
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>“Kal 5 baje assignment submit karna hai, Ravi ko PPT bhejna hai, aur Friday ko meeting hai.”</Text>
      </View>
      <Text style={styles.arrow}>✨</Text>
      <MiniCard title="Submit assignment" meta="Tomorrow, 5:00 PM" p="high" />
      <MiniCard title="Send PPT to Ravi" meta="No deadline" p="medium" />
      <MiniCard title="Meeting with professor" meta="Friday" p="medium" />
    </View>
  );
}

function InboxVisual() {
  return (
    <View style={{ width: 320, gap: 10 }}>
      <MiniCard title="Register for Hackathon 2026" meta="Closes today" p="urgent" />
      <MiniCard title="Team meeting" meta="Today, 3:00 PM" p="high" />
      <MiniCard title="Project review" meta="In 3 days" p="medium" />
      <View style={[styles.mini, styles.miniCal, shadow.card]}>
        <Text style={{ fontSize: 22 }}>📅</Text>
        <Text style={styles.miniTitle}>Added to your calendar</Text>
      </View>
    </View>
  );
}

const PAGES = [
  { title: 'Your life is scattered.', body: 'Important tasks get lost across messages and notices.', Visual: ScatterVisual },
  { title: 'Sift understands it.', body: 'AI instantly extracts dates, deadlines, and actions from your inputs.', Visual: UnderstandVisual },
  { title: 'Everything becomes an action.', body: 'One calm inbox sorted by priority, ready for your calendar.', Visual: InboxVisual },
];

export function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { update } = useSettings();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const finish = () => update({ onboarded: true });
  const next = () => {
    if (index >= PAGES.length - 1) finish();
    else listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.skipRow, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.brand}>Sift</Text>
        {index < PAGES.length - 1 ? (
          <Pressable onPress={finish} style={styles.skip} accessibilityRole="button" accessibilityLabel="Skip introduction">
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => p.title}
        onMomentumScrollEnd={onEnd}
        renderItem={({ item }) => (
          <View style={{ width, paddingHorizontal: 24 }}>
            <View style={styles.visual}>
              <item.Visual />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dots} accessibilityLabel={`Page ${index + 1} of ${PAGES.length}`}>
          {PAGES.map((p, i) => (
            <View key={p.title} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Button label={index === PAGES.length - 1 ? 'Get Started' : 'Next'} onPress={next} icon={index === PAGES.length - 1 ? 'sparkles' : undefined} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  brand: { fontSize: 20, fontWeight: '900', color: colors.primary, letterSpacing: -0.5 },
  skip: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 16, fontWeight: '700', color: colors.muted },
  visual: { height: 330, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  title: { ...type.display, marginTop: 8 },
  body: { ...type.body, fontSize: 17, lineHeight: 25, marginTop: 12, color: colors.muted },
  footer: { paddingHorizontal: 24, gap: 18 },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#CFCBEA' },
  dotActive: { width: 26, backgroundColor: colors.primary },
  scatter: { position: 'absolute', paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.lg },
  scatterText: { fontSize: 17, fontWeight: '800', color: colors.ink },
  bubble: { backgroundColor: '#DDF5EA', padding: 14, borderRadius: radius.lg, borderTopLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21, color: '#0B3B2B', fontWeight: '600' },
  arrow: { fontSize: 22, textAlign: 'center' },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, padding: 12, paddingLeft: 0, borderRadius: radius.md, overflow: 'hidden' },
  miniCal: { paddingLeft: 14, justifyContent: 'center', backgroundColor: colors.aquaSoft },
  miniBar: { width: 5, alignSelf: 'stretch' },
  miniTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  miniMeta: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 1 },
  miniBadge: { fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
});
