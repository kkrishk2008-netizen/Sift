import { DefaultTheme, LinkingOptions, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { colors, gradients } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { AuthScreen } from '../screens/AuthScreen';
import { DigestScreen } from '../screens/DigestScreen';
import { ImageScannerScreen } from '../screens/ImageScannerScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { SharedMessageScreen } from '../screens/SharedMessageScreen';
import { TaskDetailScreen } from '../screens/TaskDetailScreen';
import { VoiceDumpScreen } from '../screens/VoiceDumpScreen';
import type { RootStackParamList } from '../types/navigation';
import { MainTabs } from './MainTabs';

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.primary } };

// sift://share?initialText=... opens the paste screen pre-filled (works with Android Shortcuts/Tasker, etc.)
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['sift://'],
  config: { screens: { SharedMessage: 'share' } },
};

function Splash() {
  return (
    <LinearGradient colors={gradients.capture} style={styles.splash}>
      <Text style={styles.logo}>Sift</Text>
      <ActivityIndicator color="#FFFFFF" style={{ marginTop: 18 }} />
    </LinearGradient>
  );
}

export function RootNavigator() {
  const { loaded, settings } = useSettings();
  const { mode } = useAuth();

  if (!loaded || mode === 'loading') return <Splash />;

  return (
    <NavigationContainer theme={theme} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {!settings.onboarded ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade' }} />
        ) : mode === 'signedOut' ? (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ animation: 'fade' }} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ animation: 'fade' }} />
            <Stack.Screen name="ImageScanner" component={ImageScannerScreen} />
            <Stack.Screen name="VoiceDump" component={VoiceDumpScreen} />
            <Stack.Screen name="SharedMessage" component={SharedMessageScreen} />
            <Stack.Screen name="Result" component={ResultScreen} options={{ animation: 'fade_from_bottom' }} />
            <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="Digest" component={DigestScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 46, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1.5 },
});
