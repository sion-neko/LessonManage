import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as repo from '@/db/repo';
import type { AppData, Folder, Lesson, Song, Topic } from '@/data/types';
import { todayYmd } from '@/lib/date';

const CURRENT_FOLDER = 'currentFolderId';

type AppState = {
  /** 読み込みが終わるまで null */
  data: AppData | null;
  folder: Folder | undefined;
  setFolderId: (id: string) => void;
  addFolder: (name: string, teacher: string) => Promise<void>;
  updateFolder: (id: string, name: string, teacher: string) => Promise<void>;
  folderContents: (id: string) => Promise<{ lessons: number; songs: number }>;
  deleteFolder: (id: string) => Promise<void>;
  /** 今日のレッスンを作り、その ID を返す */
  addLesson: (folderId: string) => Promise<string>;
};

const Ctx = createContext<AppState | null>(null);

// データは SQLite に置き、書いたら全部読み直す（量が少ないうちはこれで足りる）
export function AppStateProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [data, setData] = useState<AppData | null>(null);
  const [folderId, setFolderIdState] = useState<string | null>(null);

  const reload = useCallback(async () => setData(await repo.loadAll(db)), [db]);

  useEffect(() => {
    (async () => {
      setFolderIdState(await repo.getSetting(db, CURRENT_FOLDER));
      await reload();
    })();
  }, [db, reload]);

  const setFolderId = useCallback(
    (id: string) => {
      setFolderIdState(id);
      repo.setSetting(db, CURRENT_FOLDER, id);
    },
    [db],
  );

  const value = useMemo<AppState>(() => {
    // 保存していたフォルダが消えていたら、最初のフォルダにする
    const folder = data?.folders.find((f) => f.id === folderId) ?? data?.folders[0];
    return {
      data,
      folder,
      setFolderId,
      addFolder: async (name, teacher) => {
        const id = await repo.addFolder(db, name, teacher);
        setFolderId(id);
        await reload();
      },
      updateFolder: async (id, name, teacher) => {
        await repo.updateFolder(db, id, name, teacher);
        await reload();
      },
      folderContents: (id) => repo.folderContents(db, id),
      deleteFolder: async (id) => {
        await repo.deleteFolder(db, id);
        await reload();
      },
      addLesson: async (fid) => {
        const id = await repo.addLesson(db, fid, todayYmd());
        await reload();
        return id;
      },
    };
  }, [data, folderId, db, reload, setFolderId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error('AppStateProvider の外で useAppState が呼ばれた');
  return v;
}

/** 読み込みが終わった後の画面で使う */
export function useLoadedState() {
  const s = useAppState();
  if (!s.data) throw new Error('データの読み込み前に使われた');
  return { ...s, data: s.data };
}

/** フォルダのレッスンを新しい順に */
export function lessonsOf(data: AppData, folderId: string | undefined): Lesson[] {
  return data.lessons.filter((l) => l.folderId === folderId).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function songsOf(data: AppData, folderId: string | undefined): Song[] {
  return data.songs.filter((s) => s.folderId === folderId);
}

export function topicLabel(data: AppData, t: Topic): string {
  if (t.kind === 'word') return t.label;
  return data.songs.find((s) => s.id === t.songId)?.title ?? '（消えた曲）';
}
