import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

import * as repo from '@/db/repo';
import type { Recording } from '@/data/types';
import { keepRecording } from '@/lib/audio-files';
import { todayYmd } from '@/lib/date';
import { newId } from '@/lib/id';
import { useAppState } from './app-state';

// 録音はアプリに1本だけ。どの画面にいても続く（画面を移っても止まらない）
// 今の版は Expo Go で動く範囲：画面がロックされると止まるので、録音中は画面を消えないようにしている。
// ロック中も録り続ける設定（バックグラウンド録音）は、自分用のアプリを作るときに足す

export type RecTarget = {
  kind: Recording['kind'];
  folderId: string;
  lessonId: string | null;
  songId: string | null;
};

type RecorderState = {
  /** 録音中の対象。録っていなければ null */
  target: RecTarget | null;
  /** 経過時間（秒） */
  elapsed: number;
  /** 音の大きさ（0〜1）。波形の表示に使う */
  level: number;
  start: (t: RecTarget) => Promise<boolean>;
  /** 止めて保存し、保存した録音の ID を返す */
  stop: () => Promise<string | null>;
};

const Ctx = createContext<RecorderState | null>(null);
const KEEP_AWAKE = 'recording';

export function RecorderProvider({ children }: { children: ReactNode }) {
  const { act } = useAppState();
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const status = useAudioRecorderState(recorder, 250);
  const [target, setTarget] = useState<RecTarget | null>(null);
  const busy = useRef(false);

  const start = useCallback(
    async (t: RecTarget) => {
      if (busy.current || target) return false;
      busy.current = true;
      try {
        const perm = await requestRecordingPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('マイクが使えません', '設定アプリで、このアプリのマイクをオンにしてください。');
          return false;
        }
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        await activateKeepAwakeAsync(KEEP_AWAKE).catch(() => {});
        setTarget(t);
        return true;
      } catch (e) {
        Alert.alert('録音を始められませんでした', String(e));
        return false;
      } finally {
        busy.current = false;
      }
    },
    [recorder, target],
  );

  const stop = useCallback(async () => {
    if (!target || busy.current) return null;
    busy.current = true;
    try {
      const duration = recorder.currentTime || status.durationMillis / 1000;
      await recorder.stop();
      // Web などで有効にできていなかったときは、解除でエラーになるので無視する
      Promise.resolve()
        .then(() => deactivateKeepAwake(KEEP_AWAKE))
        .catch(() => {});
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      const uri = recorder.uri;
      setTarget(null);
      if (!uri) {
        Alert.alert('録音を保存できませんでした', 'ファイルが見つかりません。');
        return null;
      }
      const id = newId('r');
      const file = await keepRecording(uri, id);
      await act((db) => repo.addRecording(db, { id, ...target, date: todayYmd(), duration, note: '', file }));
      return id;
    } catch (e) {
      Alert.alert('録音を保存できませんでした', String(e));
      setTarget(null);
      return null;
    } finally {
      busy.current = false;
    }
  }, [act, recorder, status.durationMillis, target]);

  // metering は dB（-160〜0）。-60dB 以下を 0 として 0〜1 に
  const level = status.metering == null ? 0 : Math.max(0, Math.min(1, (status.metering + 60) / 60));
  const value = useMemo<RecorderState>(
    () => ({ target, elapsed: target ? status.durationMillis / 1000 : 0, level: target ? level : 0, start, stop }),
    [target, status.durationMillis, level, start, stop],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRecorder() {
  const v = useContext(Ctx);
  if (!v) throw new Error('RecorderProvider の外で useRecorder が呼ばれた');
  return v;
}

/** 秒を「12:40」「1:02:03」に */
export function fmtDur(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
