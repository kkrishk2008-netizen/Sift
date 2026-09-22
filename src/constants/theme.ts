import { Platform, TextStyle, ViewStyle } from 'react-native';
import type { Priority } from '../types';

export const colors = {
  bg: '#F3F4FB',
  surface: '#FFFFFF',
  ink: '#14122B',
  inkSoft: '#3A3758',
  muted: '#645F86', // 5.9:1 on white
  line: '#E4E3F1',
  primary: '#5B3DF5',
  primaryDeep: '#3B22C9',
  primarySoft: '#ECE8FF',
  aqua: '#12B5A6',
  aquaSoft: '#DDF6F3',
  success: '#12805C',
  successSoft: '#DDF5EA',
  warning: '#B45309',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(20,18,43,0.45)',
} as const;

export const gradients = {
  primary: ['#6D4BFF', '#4A2FE0'] as const,
  ai: ['#7C5CFF', '#2CC8D8'] as const,
  capture: ['#7B5CFF', '#3B22C9'] as const,
  poster: ['#1B1145', '#5B3DF5', '#12B5A6'] as const,
};

export interface PriorityMeta {
  label: string;
  emoji: string;
  color: string;
  soft: string;
}

export const priorityMeta: Record<Priority, PriorityMeta> = {
  urgent: { label: 'URGENT', emoji: '🔴', color: '#C81E2B', soft: '#FDECEC' },
  high: { label: 'HIGH', emoji: '🟠', color: '#B8500A', soft: '#FFF0E0' },
  medium: { label: 'MEDIUM', emoji: '🔵', color: '#2F4FCB', soft: '#E8EDFF' },
  low: { label: 'LOW', emoji: '⚪', color: '#5B5F6B', soft: '#EEF0F4' },
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 30, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const shadow = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#2B1F7A',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    default: { elevation: 2, shadowColor: '#2B1F7A' },
  }) as ViewStyle,
  float: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#3B22C9',
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    default: { elevation: 5, shadowColor: '#3B22C9' },
  }) as ViewStyle,
};

export const type = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.9, color: colors.ink } as TextStyle,
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.6, color: colors.ink } as TextStyle,
  h2: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.3, color: colors.ink } as TextStyle,
  h3: { fontSize: 17, lineHeight: 23, fontWeight: '700', color: colors.ink } as TextStyle,
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400', color: colors.inkSoft } as TextStyle,
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600', color: colors.ink } as TextStyle,
  small: { fontSize: 14, lineHeight: 20, fontWeight: '500', color: colors.muted } as TextStyle,
  tiny: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.4, color: colors.muted } as TextStyle,
};

export const MIN_TOUCH = 48;
