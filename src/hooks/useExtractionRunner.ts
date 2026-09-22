import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../context/ToastContext';
import type { ExtractionResult } from '../types';
import type { RootStackParamList } from '../types/navigation';
import { hapticSuccess, hapticWarning } from '../utils/haptics';

type Job = () => Promise<ExtractionResult>;
export type RunnerStatus = 'idle' | 'processing' | 'error';

/**
 * Runs any capture job (image / voice / text), drives the "AI processing" UI,
 * and hands the result to the Result screen. Never throws: failures become `status === 'error'`.
 */
export function useExtractionRunner() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();
  const [status, setStatus] = useState<RunnerStatus>('idle');
  const [error, setError] = useState<unknown>(null);
  const [foundCount, setFoundCount] = useState<number | null>(null);
  const lastJob = useRef<Job | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = useCallback(
    async (job: Job) => {
      lastJob.current = job;
      setError(null);
      setFoundCount(null);
      setStatus('processing');
      try {
        const [result] = await Promise.all([job(), new Promise((r) => setTimeout(r, 1800))]); // let the animation breathe
        if (!alive.current) return;
        setFoundCount(result.items.length);
        hapticSuccess();
        await new Promise((r) => setTimeout(r, 950));
        if (!alive.current) return;
        navigation.replace('Result', { result });
      } catch (e) {
        if (!alive.current) return;
        hapticWarning();
        setError(e);
        setStatus('error');
        if (__DEV__) console.warn('[extraction failed]', e);
      }
    },
    [navigation],
  );

  const retry = useCallback(() => {
    if (lastJob.current) void run(lastJob.current);
    else toast.show('Nothing to retry yet.');
  }, [run, toast]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setFoundCount(null);
  }, []);

  return { status, error, foundCount, run, retry, reset };
}
