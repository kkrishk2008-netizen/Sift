import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, priorityMeta, shadow } from '../constants/theme';
import { useTasks } from '../context/TasksContext';
import { useNow } from '../hooks/useNow';
import { hapticMedium, hapticSelect } from '../utils/haptics';
import { sectionOf } from '../utils/inbox';
import { Icon, IconName } from './Icon';

const ICONS: Record<string, { on: IconName; off: IconName; label: string }> = {
  Inbox: { on: 'file-tray-full', off: 'file-tray-full-outline', label: 'Inbox' },
  Calendar: { on: 'calendar', off: 'calendar-outline', label: 'Calendar' },
  Settings: { on: 'settings', off: 'settings-outline', label: 'Settings' },
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { tasks } = useTasks();
  const now = useNow();
  const urgentCount = tasks.filter((t) => t.status === 'open' && sectionOf(t, now) === 'urgent').length;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const onPress = () => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
        };

        if (route.name === 'Capture') {
          return (
            <View key={route.key} style={styles.slot}>
              <Pressable
                onPress={() => {
                  hapticMedium();
                  onPress();
                }}
                accessibilityRole="button"
                accessibilityLabel="Capture. Scan a task, record a voice note or paste a message"
                accessibilityState={{ selected: focused }}
                style={({ pressed }) => [styles.fabWrap, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}
              >
                <LinearGradient colors={gradients.capture} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.fab, shadow.float]}>
                  <Icon name={focused ? 'sparkles' : 'add'} size={focused ? 30 : 36} color={colors.white} />
                </LinearGradient>
                <Text style={[styles.label, styles.fabLabel]}>Capture</Text>
              </Pressable>
            </View>
          );
        }

        const meta = ICONS[route.name];
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              hapticSelect();
              onPress();
            }}
            style={styles.slot}
            accessibilityRole="tab"
            accessibilityLabel={meta.label + (route.name === 'Inbox' && urgentCount ? `, ${urgentCount} urgent` : '')}
            accessibilityState={{ selected: focused }}
          >
            <View>
              <Icon name={focused ? meta.on : meta.off} size={26} color={focused ? colors.primary : colors.muted} />
              {route.name === 'Inbox' && urgentCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{urgentCount > 9 ? '9+' : urgentCount}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, focused && { color: colors.primary }]}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', backgroundColor: colors.surface, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: colors.line,
  },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 56 },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 3 },
  fabWrap: { alignItems: 'center', marginTop: -34 },
  fab: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.bg },
  fabLabel: { color: colors.primary, marginTop: 4 },
  badge: { position: 'absolute', top: -5, right: -10, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: priorityMeta.urgent.color, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
});
