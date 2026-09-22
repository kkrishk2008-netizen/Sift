import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { ErrorPanel } from '../components/ErrorPanel';
import { Icon } from '../components/Icon';
import { ProcessingView } from '../components/ProcessingView';
import { ScreenHeader } from '../components/ScreenHeader';
import { DEMO_TEXTS } from '../constants/demoData';
import { colors, gradients, priorityMeta, radius, shadow, type } from '../constants/theme';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useAppNav } from '../hooks/useAppNav';
import { useExtractionRunner } from '../hooks/useExtractionRunner';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { describeError, extractActions } from '../services/ai/extractionEngine';
import { track } from '../services/analytics';
import { transcribeAudio } from '../services/speech/transcribe';
import type { ExtractionResult } from '../types';
import { hapticMedium } from '../utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function VoiceDumpScreen() {
  const nav = useAppNav();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const toast = useToast();
  const runner = useExtractionRunner();
  const rec = useVoiceRecorder();
  const pulse = useRef(new Animated.Value(0)).current;
  const recording = rec.state === 'recording';

  useEffect(() => {
    if (!recording) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [recording, pulse]);

  const finish = async () => {
    const out = await rec.stop();
    if (!out) {
      toast.show("That recording couldn't be saved. Please try again.", 'error');
      return;
    }
    if (out.seconds < 1) {
      toast.show('Too short. Hold on a little longer and speak.');
      return;
    }
    track('voice_recorded', { seconds: out.seconds });
    runner.run(async (): Promise<ExtractionResult> => {
      const t = await transcribeAudio(out.uri, settings.demoMode);
      const res = await extractActions({ kind: 'text', text: t.text, source: 'voice' }, { demoMode: settings.demoMode });
      return {
        ...res,
        transcript: t.text,
        notice:
          t.engine === 'demo'
            ? 'Demo Mode: Sift used a sample Hinglish transcript instead of transcribing your voice. Turn Demo Mode off and add a speech key for real transcription.'
            : res.notice,
      };
    });
  };

  const onMic = async () => {
    hapticMedium();
    if (recording) await finish();
    else await rec.start();
  };

  const useSampleNote = () =>
    runner.run(async () => {
      track('voice_recorded', { sample: true });
      const res = await extractActions({ kind: 'text', text: DEMO_TEXTS.voice, source: 'voice' }, { demoMode: settings.demoMode });
      return { ...res, transcript: DEMO_TEXTS.voice };
    });

  if (runner.status === 'processing') {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ProcessingView
          foundCount={runner.foundCount}
          steps={['Transcribing your voice...', 'Finding dates...', 'Understanding intent...', 'Creating actions...']}
        />
      </View>
    );
  }

  const ringStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Voice Dump" subtitle="Say everything on your mind. Mix Hindi, English or your language." onBack={() => { void rec.stop(); nav.goBack(); }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 30, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
        {runner.status === 'error' ? (
          <View style={{ alignSelf: 'stretch' }}>
            <ErrorPanel {...describeError(runner.error)} onRetry={runner.retry} onManual={() => nav.replace('TaskDetail', { draft: { source: 'voice' } })} />
          </View>
        ) : rec.state === 'denied' ? (
          <View style={[styles.warn, { alignSelf: 'stretch' }]} accessibilityRole="alert">
            <Text style={styles.warnTitle}>Microphone access is off</Text>
            <Text style={styles.warnText}>Sift needs the microphone to hear your voice dump. Allow it in Settings, or type your message instead.</Text>
            <Button label="Open Settings" variant="secondary" small onPress={() => Linking.openSettings().catch(() => undefined)} style={{ marginTop: 12 }} />
            <Button label="Type it instead" variant="soft" small onPress={() => nav.replace('SharedMessage')} style={{ marginTop: 8 }} />
          </View>
        ) : (
          <>
            <View style={styles.micArea}>
              {recording ? <Animated.View style={[styles.ring, ringStyle]} /> : null}
              <Pressable
                onPress={onMic}
                accessibilityRole="button"
                accessibilityLabel={recording ? 'Stop recording' : 'Start Voice Dump'}
                style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}
              >
                <LinearGradient colors={recording ? (['#E5484D', '#B4232E'] as const) : gradients.capture} style={[styles.mic, shadow.float]}>
                  <Icon name={recording ? 'stop' : 'mic'} size={56} color={colors.white} />
                </LinearGradient>
              </Pressable>
            </View>

            {recording ? (
              <>
                <Text style={styles.rec} accessibilityLiveRegion="polite">🔴 Recording...</Text>
                <Text style={styles.timer}>{mmss(rec.seconds)}</Text>
                <Text style={styles.hint}>Tap the button when you’re done.</Text>
              </>
            ) : (
              <>
                <Text style={styles.startLabel}>Start Voice Dump</Text>
                <Text style={styles.hint}>Tap the mic and talk.</Text>
                <View style={styles.example}>
                  <Text style={styles.exampleLabel}>Try saying</Text>
                  <Text style={styles.exampleText}>“{DEMO_TEXTS.voice}”</Text>
                </View>
                <Button label="Use a sample voice note" icon="flash-outline" variant="soft" onPress={useSampleNote} style={{ alignSelf: 'stretch', marginTop: 8 }} />
                {rec.state === 'error' ? <Text style={styles.err}>The microphone couldn’t start. Try again.</Text> : null}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  micArea: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  ring: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: '#E5484D' },
  mic: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
  rec: { fontSize: 20, fontWeight: '800', color: priorityMeta.urgent.color, marginTop: 8 },
  timer: { fontSize: 54, fontWeight: '800', color: colors.ink, letterSpacing: 1, marginTop: 4, fontVariant: ['tabular-nums'] },
  startLabel: { ...type.h2, marginTop: 8 },
  hint: { ...type.small, marginTop: 4, textAlign: 'center' },
  example: { alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginTop: 26 },
  exampleLabel: { fontSize: 12, fontWeight: '800', color: colors.primary, marginBottom: 6 },
  exampleText: { fontSize: 15, lineHeight: 22, color: colors.inkSoft, fontStyle: 'italic' },
  warn: { backgroundColor: priorityMeta.high.soft, padding: 18, borderRadius: radius.lg },
  warnTitle: { fontSize: 17, fontWeight: '800', color: '#7A3708' },
  warnText: { fontSize: 14, lineHeight: 20, color: '#7A3708', marginTop: 6, fontWeight: '500' },
  err: { color: priorityMeta.urgent.color, fontWeight: '700', marginTop: 14 },
});
