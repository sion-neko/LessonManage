import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { sampleData } from '@/data/sample';
import type { AppData, Folder, Lesson, Song, Topic } from '@/data/types';

type AppState = {
  data: AppData;
  folder: Folder | undefined;
  setFolderId: (id: string) => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  // 今はサンプルデータをメモリに持つだけ。端末への保存は次の区切りで作る
  const [data] = useState<AppData>(sampleData);
  const [folderId, setFolderId] = useState<string | undefined>(sampleData.folders[0]?.id);
  const folder = data.folders.find((f) => f.id === folderId) ?? data.folders[0];
  const value = useMemo(() => ({ data, folder, setFolderId }), [data, folder]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error('AppStateProvider の外で useAppState が呼ばれた');
  return v;
}

/** フォルダのレッスンを新しい順に */
export function lessonsOf(data: AppData, folderId: string | undefined): Lesson[] {
  return data.lessons
    .filter((l) => l.folderId === folderId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function songsOf(data: AppData, folderId: string | undefined): Song[] {
  return data.songs.filter((s) => s.folderId === folderId);
}

export function topicLabel(data: AppData, t: Topic): string {
  if (t.kind === 'word') return t.label;
  return data.songs.find((s) => s.id === t.songId)?.title ?? '（消えた曲）';
}
