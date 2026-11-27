import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { AppData, Recording } from '@/data/types';
import { recordingUri } from '@/lib/audio-files';
import { fmtDate } from '@/lib/date';
import { chapterAt } from '@/lib/chapters';
import { topicLabel } from './app-state';

// 再生はアプリに1本だけ。画面を移っても流れ続ける（ポッドキャストのミニプレーヤーと同じ）

type PlayerState = {
  /** 読み込んでいる録音の ID */
  recId: string | null;
  /** 再生バーを出すか。何かを流したときだけ出る（再生画面を開いただけでは出ない） */
  barShown: boolean;
  playing: boolean;
  position: number;
  duration: number;
  rate: number;
  /** 流さずに読み込む（再生画面を開くとき） */
  open: (r: Recording) => void;
  /** 読み込んで流す。at を渡すとその位置から */
  play: (r: Recording, at?: number) => void;
  toggle: () => void;
  seek: (t: number) => void;
  skip: (d: number) => void;
  setRate: (r: number) => void;
  /** 止めて再生バーを消す（×、下スワイプ、録音の削除） */
  close: () => void;
  /** 録音を始めるときに一時停止する */
  pauseForRecording: () => void;
};

const Ctx = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(undefined, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [recId, setRecId] = useState<string | null>(null);
  const [barShown, setBarShown] = useState(false);
  const [rate, setRateState] = useState(1);
  const pendingSeek = useRef<number | null>(null);

  const load = useCallback(
    (r: Recording) => {
      if (recId === r.id) return;
      player.replace({ uri: recordingUri(r.file) });
      player.shouldCorrectPitch = true;
      player.setPlaybackRate(rate, 'high');
      setRecId(r.id);
    },
    [player, rate, recId],
  );

  // 読み込みが終わってから位置を合わせる
  useEffect(() => {
    if (status.isLoaded && pendingSeek.current != null) {
      player.seekTo(pendingSeek.current);
      pendingSeek.current = null;
    }
  }, [status.isLoaded, player]);

  // 最後まで流れたら頭に戻して止める
  useEffect(() => {
    if (status.didJustFinish) {
      player.pause();
      player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  const value = useMemo<PlayerState>(() => {
    const seekTo = (t: number) => {
      if (status.isLoaded) player.seekTo(Math.max(0, t));
      else pendingSeek.current = Math.max(0, t);
    };
    return {
      recId,
      barShown,
      playing: status.playing,
      position: status.currentTime,
      duration: status.duration,
      rate,
      open: (r) => load(r),
      play: (r, at) => {
        const fresh = recId !== r.id;
        load(r);
        setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
        if (at != null) {
          if (fresh) pendingSeek.current = at;
          else player.seekTo(at);
        }
        player.play();
        setBarShown(true);
      },
      toggle: () => {
        if (status.playing) player.pause();
        else {
          player.play();
          setBarShown(true);
        }
      },
      seek: seekTo,
      skip: (d) => seekTo(Math.min(status.duration || Infinity, status.currentTime + d)),
      setRate: (v) => {
        setRateState(v);
        player.setPlaybackRate(v, 'high');
      },
      close: () => {
        player.pause();
        setBarShown(false);
      },
      pauseForRecording: () => player.pause(),
    };
  }, [recId, barShown, status.playing, status.currentTime, status.duration, status.isLoaded, rate, load, player]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const v = useContext(Ctx);
  if (!v) throw new Error('PlayerProvider の外で usePlayer が呼ばれた');
  return v;
}

/** 録音の名前（例：11/16のレッスン、11/16のレッスン後の個人練） */
export function recTitle(data: AppData, r: Recording): string {
  const lesson = r.lessonId ? data.lessons.find((l) => l.id === r.lessonId) : undefined;
  const md = (ymd: string) => fmtDate(ymd).replace(/（.）/, '');
  if (r.kind === 'lesson') return lesson ? `${md(lesson.date)}のレッスン` : 'レッスンの録音';
  if (r.kind === 'practice') return lesson ? `${md(lesson.date)}のレッスン後の個人練` : `${md(r.date)}の個人練`;
  return `${md(r.date)}の曲の録音`;
}

/** 名前の下に出すもの：レッスン録音なら今のトピック（チャプター）、ほかは曲名 */
export function recSub(data: AppData, r: Recording, t: number): string {
  if (r.kind === 'lesson') {
    const lesson = data.lessons.find((l) => l.id === r.lessonId);
    if (!lesson) return '';
    const key = chapterAt(lesson, t);
    const tp = lesson.topics.find((x) => x.key === key);
    return tp ? topicLabel(data, tp) : 'トピックなし';
  }
  const song = r.songId ? data.songs.find((s) => s.id === r.songId) : undefined;
  return song ? song.title : '曲なし';
}
