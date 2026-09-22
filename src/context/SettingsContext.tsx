import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { IS_SUPABASE_CONFIGURED } from '../constants/config';
import { setHapticsEnabled } from '../utils/haptics';

export interface Settings {
  onboarded: boolean;
  demoMode: boolean;
  haptics: boolean;
}

interface SettingsValue {
  settings: Settings;
  loaded: boolean;
  update: (patch: Partial<Settings>) => void;
}

const KEY = 'sift.settings.v1';
// Demo Mode defaults ON when there is no backend, so a judge can use everything with zero setup.
const DEFAULTS: Settings = { onboarded: false, demoMode: !IS_SUPABASE_CONFIGURED, haptics: true };

const Ctx = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setSettings({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) });
      } catch {
        /* use defaults */
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    setHapticsEnabled(settings.haptics);
  }, [settings.haptics]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, loaded, update }), [settings, loaded, update]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSettings must be used inside SettingsProvider');
  return v;
}
