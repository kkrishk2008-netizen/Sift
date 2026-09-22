import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { TasksProvider } from './src/context/TasksContext';
import { ToastProvider } from './src/context/ToastContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { track } from './src/services/analytics';

export default function App() {
  useEffect(() => {
    track('app_opened');
  }, []);

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AuthProvider>
          <TasksProvider>
            <ToastProvider>
              <StatusBar style="dark" />
              <RootNavigator />
            </ToastProvider>
          </TasksProvider>
        </AuthProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
