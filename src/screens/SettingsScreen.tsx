import Constants from 'expo-constants';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { colors, radius, shadow, type } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useTasks } from '../context/TasksContext';
import { useToast } from '../context/ToastContext';
import { useAppNav } from '../hooks/useAppNav';
import { isSupabaseConfigured } from '../services/supabase/client';

function Row({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function SettingsScreen() {
  const nav = useAppNav();
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const auth = useAuth();
  const { resetDemoData, clearAll, tasks } = useTasks();
  const toast = useToast();

  const accountLabel = auth.mode === 'user' ? auth.email ?? 'Signed in' : 'Demo user';

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 130, gap: 18 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.title} accessibilityRole="header">Settings</Text>

      <View style={[styles.card, shadow.card]}>
        <Row
          title="Demo Mode"
          subtitle={
            settings.demoMode
              ? 'On. Sample data, offline understanding, no API keys needed.'
              : isSupabaseConfigured
                ? 'Off. Using the real AI pipeline.'
                : 'Off, but no backend is configured yet, so Sift falls back to offline mode.'
          }
          right={
            <Switch
              value={settings.demoMode}
              onValueChange={(v) => update({ demoMode: v })}
              trackColor={{ true: colors.primary, false: '#CFCBEA' }}
              thumbColor={colors.white}
              accessibilityLabel="Demo Mode"
            />
          }
        />
        <View style={styles.sep} />
        <Row title="Haptic feedback" subtitle="Gentle vibrations on taps and success." right={
          <Switch value={settings.haptics} onValueChange={(v) => update({ haptics: v })} trackColor={{ true: colors.primary, false: '#CFCBEA' }} thumbColor={colors.white} accessibilityLabel="Haptic feedback" />
        } />
      </View>

      <View style={[styles.card, shadow.card]}>
        <Row title="Account" subtitle={accountLabel} />
        <View style={styles.sep} />
        <Row title="Cloud sync" subtitle={isSupabaseConfigured ? (auth.mode === 'user' ? 'On. Saved to Supabase with row-level security.' : 'Available. Log in with an account to sync.') : 'Off. Add Supabase keys to .env to enable.'} />
        <View style={styles.sep} />
        <Row title="Cloud AI" subtitle={isSupabaseConfigured ? 'Connected through Supabase Edge Functions. Keys stay on the server.' : 'Not connected. Using offline understanding.'} />
        <Button
          label={auth.mode === 'user' ? 'Log out' : 'Exit demo'}
          icon="log-out-outline"
          variant="secondary"
          small
          onPress={() => auth.signOut()}
          style={{ marginTop: 14 }}
        />
      </View>

      <View style={[styles.card, shadow.card, { gap: 12 }]}>
        <Text style={styles.rowTitle}>Try the digest</Text>
        <Text style={styles.rowSub}>See how Sift cuts a noisy day down to what matters.</Text>
        <Button label="Preview my digest" icon="notifications-outline" variant="soft" onPress={() => nav.navigate('Digest')} />
      </View>

      <View style={[styles.card, shadow.card, { gap: 12 }]}>
        <Text style={styles.rowTitle}>Your data</Text>
        <Text style={styles.rowSub}>{tasks.length} {tasks.length === 1 ? 'item' : 'items'} in your inbox.</Text>
        <Button
          label="Reload demo data"
          icon="refresh"
          variant="secondary"
          onPress={() => Alert.alert('Reload demo data?', 'This replaces your inbox with fresh sample items.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Replace', onPress: async () => { await resetDemoData(); toast.show('Demo data loaded', 'success'); } },
          ])}
        />
        <Button
          label="Clear everything"
          icon="trash-outline"
          variant="danger"
          onPress={() => Alert.alert('Clear everything?', 'All items will be deleted.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete all', style: 'destructive', onPress: async () => { await clearAll(); toast.show('Inbox cleared'); } },
          ])}
        />
        <Button label="Replay introduction" variant="ghost" small onPress={() => update({ onboarded: false })} />
      </View>

      <Text style={styles.about}>Sift v{Constants.expoConfig?.version ?? '1.0.0'} · An AI inbox that turns anything into an action.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { ...type.display },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  rowTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  rowSub: { fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 2 },
  sep: { height: 1, backgroundColor: colors.line, marginVertical: 12 },
  about: { ...type.small, textAlign: 'center', marginTop: 4 },
});
