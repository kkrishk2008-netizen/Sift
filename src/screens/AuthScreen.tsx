import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { TAGLINE } from '../constants/config';
import { colors, radius, type } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../services/supabase/client';

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInDemo } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (password.length < 6) return setError('Use a password with at least 6 characters.');
    setBusy(true);
    const res = mode === 'login' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if ('error' in res && res.error) setError(res.error);
    else if ('needsConfirmation' in res && res.needsConfirmation) setInfo('Account created. Check your email to confirm, then log in.');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, { backgroundColor: colors.primary, paddingTop: insets.top + 36 }]}>
          <Text style={styles.logo}>Sift</Text>
          <Text style={styles.tag}>{TAGLINE}</Text>
        </View>

        <View style={styles.body}>
          <Button label="Continue as Demo User" icon="flash" onPress={signInDemo} accessibilityHint="Try Sift instantly, no account needed" />
          <Text style={styles.demoNote}>No account needed. Your data stays on this phone.</Text>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.or}>or use an account</Text>
            <View style={styles.line} />
          </View>

          {isSupabaseConfigured ? (
            <View style={{ gap: 14 }}>
              <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@college.edu" />
              <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="password" placeholder="At least 6 characters" />
              {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
              {info ? <Text style={styles.info}>{info}</Text> : null}
              <Button label={mode === 'login' ? 'Log in' : 'Create account'} variant="secondary" onPress={submit} loading={busy} />
              <Pressable onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setInfo(null); }} style={styles.switch} accessibilityRole="button">
                <Text style={styles.switchText}>{mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Accounts are switched off</Text>
              <Text style={styles.noticeBody}>Add your Supabase URL and anon key to .env to enable sign up, log in and cloud sync. Everything else works in demo mode.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 28, paddingBottom: 44, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  logo: { fontSize: 44, fontWeight: '900', color: colors.white, letterSpacing: -1.5 },
  tag: { fontSize: 18, lineHeight: 25, fontWeight: '600', color: 'rgba(255,255,255,0.92)', marginTop: 8, maxWidth: 300 },
  body: { padding: 24, gap: 6 },
  demoNote: { ...type.small, textAlign: 'center', marginTop: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 },
  line: { flex: 1, height: 1, backgroundColor: colors.line },
  or: { ...type.small },
  error: { color: '#C81E2B', fontSize: 14, fontWeight: '700' },
  info: { color: colors.success, fontSize: 14, fontWeight: '700' },
  switch: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  switchText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  notice: { backgroundColor: colors.primarySoft, padding: 16, borderRadius: radius.md },
  noticeTitle: { fontSize: 15, fontWeight: '800', color: colors.primaryDeep },
  noticeBody: { fontSize: 14, lineHeight: 20, color: colors.inkSoft, marginTop: 4 },
});
