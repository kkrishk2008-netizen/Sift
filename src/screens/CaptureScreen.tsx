import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../components/Chip';
import { ErrorPanel } from '../components/ErrorPanel';
import { Icon, IconName } from '../components/Icon';
import { ProcessingView } from '../components/ProcessingView';
import { DEMO_TEXTS, demoPoster } from '../constants/demoData';
import { colors, gradients, radius, shadow, type } from '../constants/theme';
import { useSettings } from '../context/SettingsContext';
import { useAppNav } from '../hooks/useAppNav';
import { useExtractionRunner } from '../hooks/useExtractionRunner';
import { describeError, extractActions } from '../services/ai/extractionEngine';
import { track } from '../services/analytics';
import type { ExtractionResult, Source } from '../types';
import { hapticTap } from '../utils/haptics';

interface CardProps {
  emoji: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  primary?: boolean;
  icon: IconName;
}

function CaptureCard({ emoji, title, subtitle, onPress, primary, icon }: CardProps) {
  const fg = primary ? colors.white : colors.ink;
  const sub = primary ? 'rgba(255,255,255,0.85)' : colors.muted;
  const inner = (
    <View style={styles.cardRow}>
      <View style={[styles.emojiBox, primary && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
        <Text style={{ fontSize: 32 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: fg }]}>{title}</Text>
        <Text style={[styles.cardSub, { color: sub }]}>{subtitle}</Text>
      </View>
      <Icon name={icon} size={24} color={primary ? colors.white : colors.primary} />
    </View>
  );
  return (
    <Pressable
      onPress={() => {
        hapticTap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}
    >
      {primary ? (
        <LinearGradient colors={gradients.capture} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, shadow.float]}>
          {inner}
        </LinearGradient>
      ) : (
        <View style={[styles.card, styles.cardPlain, shadow.card]}>{inner}</View>
      )}
    </Pressable>
  );
}

export function CaptureScreen() {
  const nav = useAppNav();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const runner = useExtractionRunner();

  const runSample = (text: string, source: Source, withTranscript = false) =>
    runner.run(async (): Promise<ExtractionResult> => {
      track('message_processed', { sample: true });
      const res = await extractActions({ kind: 'text', text, source }, { demoMode: settings.demoMode });
      return withTranscript ? { ...res, transcript: text } : res;
    });

  if (runner.status !== 'idle') {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {runner.status === 'processing' ? (
          <ProcessingView foundCount={runner.foundCount} />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
            <ErrorPanel
              {...describeError(runner.error)}
              onRetry={runner.retry}
              onManual={() => {
                runner.reset();
                nav.navigate('TaskDetail', { draft: { source: 'manual' } });
              }}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.title} accessibilityRole="header">What do you want to turn into an action?</Text>

      <View style={{ gap: 14, marginTop: 22 }}>
        <CaptureCard primary emoji="📷" title="Scan a Task" subtitle="Snap anything with a date on it." icon="camera" onPress={() => nav.navigate('ImageScanner')} />
        <CaptureCard emoji="🎙" title="Voice Dump" subtitle="Say it messy. Hinglish is fine." icon="mic" onPress={() => nav.navigate('VoiceDump')} />
        <CaptureCard emoji="📤" title="Paste / Share Message" subtitle="WhatsApp, email, notes" icon="clipboard" onPress={() => nav.navigate('SharedMessage')} />
      </View>

      <Text style={styles.section}>Try a demo scenario</Text>
      <Text style={styles.sectionHint}>One tap runs realistic sample scenarios.</Text>
      <View style={styles.chips}>
        <Chip emoji="🚀" label="Hackathon poster" onPress={() => runSample(demoPoster(new Date()).text, 'image')} />
        <Chip emoji="🗣" label="Hinglish voice note" onPress={() => runSample(DEMO_TEXTS.voice, 'voice', true)} />
        <Chip emoji="💬" label="WhatsApp chaos" onPress={() => runSample(DEMO_TEXTS.whatsapp, 'message')} />
        <Chip emoji="🎓" label="GDSC workshop" onPress={() => runSample(DEMO_TEXTS.gdsc, 'image')} />
      </View>

      <Pressable onPress={() => nav.navigate('TaskDetail', { draft: { source: 'manual' } })} style={styles.manual} accessibilityRole="button" accessibilityLabel="Create an item manually">
        <Icon name="create-outline" size={20} color={colors.muted} />
        <Text style={styles.manualText}>Create manually</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { ...type.display, fontSize: 30, lineHeight: 36 },
  card: { borderRadius: radius.xl, padding: 18, minHeight: 104, justifyContent: 'center' },
  cardPlain: { backgroundColor: colors.surface },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  emojiBox: { width: 62, height: 62, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  cardSub: { fontSize: 15, fontWeight: '500', marginTop: 3 },
  section: { ...type.h2, marginTop: 34 },
  sectionHint: { ...type.small, marginTop: 4, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  manual: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', minHeight: 52, marginTop: 24 },
  manualText: { fontSize: 15, fontWeight: '700', color: colors.muted },
});
