import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderState = 'idle' | 'recording' | 'denied' | 'error';

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [state, setState] = useState<RecorderState>('idle');
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const active = useRef(false);

  const clearTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  const start = useCallback(async (): Promise<boolean> => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setState('denied');
        return false;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      active.current = true;
      startedAt.current = Date.now();
      setSeconds(0);
      setState('recording');
      clearTimer();
      timer.current = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)), 250);
      return true;
    } catch {
      setState('error');
      return false;
    }
  }, [recorder]);

  /** Stops and returns the local file uri (or null if nothing usable was recorded). */
  const stop = useCallback(async (): Promise<{ uri: string; seconds: number } | null> => {
    clearTimer();
    if (!active.current) return null;
    active.current = false;
    const secs = Math.max(0, Math.round((Date.now() - startedAt.current) / 1000));
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      setState('idle');
      const uri = recorder.uri;
      return uri ? { uri, seconds: secs } : null;
    } catch {
      setState('error');
      return null;
    }
  }, [recorder]);

  const reset = useCallback(() => {
    setState('idle');
    setSeconds(0);
  }, []);

  useEffect(
    () => () => {
      clearTimer();
      if (active.current) {
        active.current = false;
        recorder.stop().catch(() => undefined);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { state, seconds, start, stop, reset };
}
