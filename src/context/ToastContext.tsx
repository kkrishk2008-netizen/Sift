import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '../constants/theme';

type Kind = 'info' | 'success' | 'error';
interface ToastValue {
  show: (message: string, kind?: Kind) => void;
}
const Ctx = createContext<ToastValue>({ show: () => undefined });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; kind: Kind } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, kind: Kind = 'info') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, kind });
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
      }, 2600);
    },
    [opacity],
  );

  const value = useMemo(() => ({ show }), [show]);
  const bg = toast?.kind === 'error' ? '#8F1D28' : toast?.kind === 'success' ? '#0F6B4D' : colors.ink;

  return (
    <Ctx.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[styles.wrap, { bottom: insets.bottom + 96, opacity }]}
        >
          <View style={[styles.toast, { backgroundColor: bg }, shadow.card]}>
            <Text style={styles.text}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 20, alignItems: 'center', zIndex: 999 },
  toast: { paddingHorizontal: 18, paddingVertical: 13, borderRadius: radius.lg, maxWidth: 420 },
  text: { color: colors.white, fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
