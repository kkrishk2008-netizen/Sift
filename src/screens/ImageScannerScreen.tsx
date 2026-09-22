import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { DemoPoster } from '../components/DemoPoster';
import { ErrorPanel } from '../components/ErrorPanel';
import { ProcessingView } from '../components/ProcessingView';
import { ScreenHeader } from '../components/ScreenHeader';
import { demoPoster } from '../constants/demoData';
import { colors, priorityMeta, radius, shadow } from '../constants/theme';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useAppNav } from '../hooks/useAppNav';
import { useExtractionRunner } from '../hooks/useExtractionRunner';
import { describeError, extractActions } from '../services/ai/extractionEngine';
import { prepareImage } from '../services/ai/imagePrep';
import { track } from '../services/analytics';

interface Picked {
  uri: string;
  width?: number;
}

export function ImageScannerScreen() {
  const nav = useAppNav();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const toast = useToast();
  const runner = useExtractionRunner();
  const [picked, setPicked] = useState<Picked | null>(null);
  const [sample, setSample] = useState(false);
  const [permIssue, setPermIssue] = useState<string | null>(null);
  const poster = demoPoster(new Date());

  const handle = (res: ImagePicker.ImagePickerResult) => {
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset?.uri) {
      toast.show("That image couldn't be opened. Try another one.", 'error');
      return;
    }
    setPicked({ uri: asset.uri, width: asset.width });
    setSample(false);
    setPermIssue(null);
  };

  const takePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setPermIssue('Camera access is off. Allow it in Settings, or choose a photo from your gallery instead.');
        return;
      }
      handle(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 }));
    } catch {
      toast.show("The camera couldn't be opened on this device.", 'error');
    }
  };

  const choose = async () => {
    try {
      handle(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 }));
    } catch {
      toast.show("The gallery couldn't be opened.", 'error');
    }
  };

  const analyze = () =>
    runner.run(async () => {
      track('image_uploaded', { sample });
      if (sample || !picked) {
        return extractActions({ kind: 'text', text: poster.text, source: 'image' }, { demoMode: settings.demoMode });
      }
      const img = await prepareImage(picked.uri, picked.width);
      return extractActions({ kind: 'image', base64: img.base64, mime: img.mime, source: 'image' }, { demoMode: settings.demoMode });
    });

  const hasSelection = sample || !!picked;

  if (runner.status === 'processing') {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ProcessingView foundCount={runner.foundCount} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Scan a Task" subtitle="Snap anything with a date on it. Sift reads it for you." onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 30, gap: 16 }} showsVerticalScrollIndicator={false}>
        {runner.status === 'error' ? (
          <ErrorPanel
            {...describeError(runner.error)}
            onRetry={runner.retry}
            onManual={() => nav.replace('TaskDetail', { draft: { source: 'image' } })}
          />
        ) : (
          <>
            {hasSelection ? (
              <View style={[styles.previewWrap, shadow.card]}>
                {sample ? (
                  <DemoPoster dayLabel={poster.dayLabel} time={poster.time} />
                ) : (
                  <Image source={{ uri: picked!.uri }} style={styles.preview} resizeMode="contain" accessibilityLabel="Selected image preview" />
                )}
              </View>
            ) : (
              <View style={styles.dropzone}>
                <Text style={{ fontSize: 44 }}>🖼</Text>
                <Text style={styles.dropTitle}>Add a photo to begin</Text>
                <Text style={styles.dropHint}>Take a picture or pick a screenshot.</Text>
              </View>
            )}

            {permIssue ? (
              <View style={styles.warn} accessibilityRole="alert">
                <Text style={styles.warnText}>{permIssue}</Text>
                <Button label="Open Settings" small variant="secondary" onPress={() => Linking.openSettings().catch(() => undefined)} style={{ marginTop: 10 }} />
              </View>
            ) : null}

            {hasSelection ? (
              <>
                <Button label="Analyze with AI" icon="sparkles" onPress={analyze} />
                <View style={styles.row}>
                  <Button label="Retake" icon="camera-outline" variant="secondary" small onPress={takePhoto} style={{ flex: 1 }} />
                  <Button label="Gallery" icon="images-outline" variant="secondary" small onPress={choose} style={{ flex: 1 }} />
                </View>
              </>
            ) : (
              <>
                <Button label="Take a photo" icon="camera" onPress={takePhoto} />
                <Button label="Choose from gallery" icon="images-outline" variant="secondary" onPress={choose} />
                <Button
                  label="Use sample task"
                  icon="flash-outline"
                  variant="soft"
                  onPress={() => {
                    setSample(true);
                    setPicked(null);
                  }}
                  accessibilityHint="Try the demo without a real photo"
                />
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
  previewWrap: { borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surface },
  preview: { width: '100%', height: 380, backgroundColor: '#1B1730' },
  dropzone: { height: 260, borderRadius: radius.xl, borderWidth: 2, borderStyle: 'dashed', borderColor: '#C9C4EE', backgroundColor: '#FAF9FF', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 6 },
  dropTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 6 },
  dropHint: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  warn: { backgroundColor: priorityMeta.high.soft, padding: 14, borderRadius: radius.md },
  warnText: { color: '#7A3708', fontSize: 14, lineHeight: 20, fontWeight: '600' },
});
