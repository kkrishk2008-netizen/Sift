import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { ErrorPanel } from '../components/ErrorPanel';
import { ProcessingView } from '../components/ProcessingView';
import { ScreenHeader } from '../components/ScreenHeader';
import { TextField } from '../components/TextField';
import { DEMO_TEXTS } from '../constants/demoData';
import { colors, type } from '../constants/theme';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useExtractionRunner } from '../hooks/useExtractionRunner';
import { describeError, extractActions } from '../services/ai/extractionEngine';
import { track } from '../services/analytics';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'SharedMessage'>;

export function SharedMessageScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const toast = useToast();
  const runner = useExtractionRunner();
  const [text, setText] = useState(route.params?.initialText ?? '');
  const [error, setError] = useState<string | null>(null);

  const paste = async () => {
    try {
      const clip = await Clipboard.getStringAsync();
      if (!clip.trim()) {
        toast.show('Your clipboard is empty. Copy a message first.');
        return;
      }
      setText(clip);
      setError(null);
    } catch {
      toast.show("Couldn't read the clipboard. Paste into the box manually.", 'error');
    }
  };

  const analyze = () => {
    if (!text.trim()) {
      setError('Paste or type a message first.');
      return;
    }
    setError(null);
    runner.run(async () => {
      track('message_processed', { length: text.length });
      return extractActions({ kind: 'text', text, source: 'message' }, { demoMode: settings.demoMode });
    });
  };

  if (runner.status === 'processing') {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ProcessingView foundCount={runner.foundCount} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Paste a message" subtitle="Forward a WhatsApp, email or notice. Sift finds what to do." onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 30, gap: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {runner.status === 'error' ? (
          <ErrorPanel
            {...describeError(runner.error)}
            onRetry={runner.retry}
            onManual={() => navigation.replace('TaskDetail', { draft: { source: 'message', original_text: text, description: text } })}
          />
        ) : (
          <>
            <TextField
              label="Message"
              value={text}
              onChangeText={(t) => {
                setText(t);
                if (error) setError(null);
              }}
              placeholder={'e.g. Guys reminder!!! Tomorrow 10 AM everyone submit the project report…'}
              multiline
              style={{ minHeight: 190, fontSize: 17 }}
              error={error}
            />
            <View style={styles.row}>
              <Button label="Paste from clipboard" icon="clipboard-outline" variant="secondary" small onPress={paste} style={{ flex: 1 }} />
              {text ? <Button label="Clear" icon="close" variant="ghost" small onPress={() => { setText(''); setError(null); }} /> : null}
            </View>

            <Button label="Turn into actions" icon="sparkles" onPress={analyze} />

            <View>
              <Text style={styles.sampleTitle}>Or try a sample</Text>
              <View style={styles.chips}>
                <Chip emoji="💬" label="WhatsApp chaos" onPress={() => setText(DEMO_TEXTS.whatsapp)} />
                <Chip emoji="🎓" label="GDSC workshop" onPress={() => setText(DEMO_TEXTS.gdsc)} />
                <Chip emoji="📚" label="Two assignments" onPress={() => setText(DEMO_TEXTS.hinglishTwo)} />
                <Chip emoji="🗓" label="Meeting moved" onPress={() => setText(DEMO_TEXTS.meeting)} />
                <Chip emoji="🌴" label="Malayalam" onPress={() => setText(DEMO_TEXTS.malayalam)} />
              </View>
            </View>

            <Text style={styles.note}>
              Sharing straight from WhatsApp needs a development build (Android share intent). Copy and paste works everywhere, and the link sift://share?initialText=… opens this screen with text filled in.
            </Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  sampleTitle: { ...type.h3, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  note: { ...type.small, lineHeight: 19 },
});
